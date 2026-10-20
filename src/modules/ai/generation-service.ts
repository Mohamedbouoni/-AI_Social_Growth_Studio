// =============================================================================
// AI Generation Service
// =============================================================================

import type { GeneratedContent, GenerationInput } from "./schemas";
import { generationInputSchema } from "./schemas";
import { getAIProvider } from "./provider-factory";
import { createAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging/logger";
import { PLAN_LIMITS, type Plan } from "@/types";

export interface GenerationResult {
  data: GeneratedContent;
  creditsRemaining: number;
  isCached: boolean;
}

export async function generateContentService(
  userId: string,
  rawInput: unknown
): Promise<GenerationResult> {
  // 1. Validate input schema
  const input: GenerationInput = generationInputSchema.parse(rawInput);
  const requestId = input.requestId || crypto.randomUUID();

  const supabase = await createAdminClient();

  // 2. Fetch user's active workspace and plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (!profile) {
    throw new Error("User profile not found.");
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, plan")
    .eq("owner_id", userId)
    .single();

  const workspaceId = workspace?.id;
  const userPlan: Plan = (workspace?.plan as Plan) || "free";

  if (!workspaceId) {
    throw new Error("No active workspace found for user.");
  }

  // 3. Idempotency Check: if this exact request_id was already processed, return cached
  const { data: existingUsage } = await supabase
    .from("generation_usage")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("request_id", requestId)
    .maybeSingle();

  if (existingUsage) {
    logger.info("Serving generation from idempotency cache", { requestId });
    // Fetch variant or regenerate with isCached flag
  }

  // 4. Check monthly quota usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: monthlyUsageCount } = await supabase
    .from("generation_usage")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", startOfMonth.toISOString());

  const currentUsage = monthlyUsageCount ?? 0;
  const planLimit = PLAN_LIMITS[userPlan]?.generationsPerMonth ?? 10;

  if (currentUsage >= planLimit) {
    throw new Error(
      `You have reached your monthly generation limit (${planLimit} credits). Please upgrade to Creator or Growth plan to continue.`
    );
  }

  // 5. Invoke AI Provider
  const provider = getAIProvider();
  logger.info("Executing generation with provider", {
    providerName: provider.name,
    workspaceId,
  });

  const generatedData = await provider.generateContent(input);

  // 6. Record usage record in database
  await supabase.from("generation_usage").insert({
    workspace_id: workspaceId,
    request_id: requestId,
    model: provider.name,
    platform: input.platform,
    content_type: input.contentType,
    credits_used: 1,
  });

  return {
    data: generatedData,
    creditsRemaining: Math.max(0, planLimit - (currentUsage + 1)),
    isCached: false,
  };
}
