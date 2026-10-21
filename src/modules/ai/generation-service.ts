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

/**
 * Expected, user-facing failures. The message is safe to return to the client.
 */
export class GenerationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "GenerationError";
  }
}

type ReservationResult = {
  status: "reserved" | "duplicate" | "limit_reached";
  used: number;
};

export async function generateContentService(
  userId: string,
  rawInput: unknown
): Promise<GenerationResult> {
  // 1. Validate input schema
  const input: GenerationInput = generationInputSchema.parse(rawInput);
  const requestId = input.requestId || crypto.randomUUID();

  const supabase = createAdminClient();

  // 2. Fetch user's active workspace and plan
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, plan")
    .eq("owner_id", userId)
    .maybeSingle();

  if (workspaceError) {
    throw new Error(`Workspace lookup failed: ${workspaceError.message}`);
  }

  if (!workspace) {
    throw new GenerationError("No active workspace found for user.", 404);
  }

  const workspaceId: string = workspace.id;
  const userPlan: Plan = (workspace.plan as Plan) || "free";
  const planLimit = PLAN_LIMITS[userPlan]?.generationsPerMonth ?? 10;
  const provider = getAIProvider();

  // 3. Atomically check quota + idempotency and reserve one credit
  const { data: reservation, error: reservationError } = await supabase.rpc(
    "reserve_generation_credit",
    {
      p_workspace_id: workspaceId,
      p_request_id: requestId,
      p_limit: planLimit,
      p_model: provider.name,
      p_platform: input.platform,
      p_content_type: input.contentType,
    }
  );

  if (reservationError) {
    throw new Error(`Credit reservation failed: ${reservationError.message}`);
  }

  const { status, used } = reservation as ReservationResult;

  if (status === "duplicate") {
    // Generated content is not persisted yet, so a replayed request_id can't
    // be served from cache — reject it instead of charging a second credit.
    throw new GenerationError(
      "This request has already been processed. Please submit a new request.",
      409
    );
  }

  if (status === "limit_reached") {
    throw new GenerationError(
      `You have reached your monthly generation limit (${planLimit} credits). Please upgrade to Creator or Growth plan to continue.`,
      403
    );
  }

  // 4. Invoke AI Provider — release the reserved credit if it fails
  logger.info("Executing generation with provider", {
    providerName: provider.name,
    workspaceId,
  });

  let generatedData: GeneratedContent;
  try {
    generatedData = await provider.generateContent(input);
  } catch (err) {
    const { error: releaseError } = await supabase
      .from("generation_usage")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("request_id", requestId);

    if (releaseError) {
      logger.error("Failed to release generation credit", {
        requestId,
        error: releaseError.message,
      });
    }
    throw err;
  }

  return {
    data: generatedData,
    creditsRemaining: Math.max(0, planLimit - used),
    isCached: false,
  };
}
