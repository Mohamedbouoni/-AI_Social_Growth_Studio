// =============================================================================
// Repurpose Service — one idea into YouTube + TikTok + Instagram (paid plans)
// =============================================================================
// Reserves 3 credits up front, generates the three formats in parallel, and
// charges only for the formats that succeeded.
// =============================================================================

import { z } from "zod";
import { generationInputSchema, type ContentType, type GeneratedContent, type Platform } from "./schemas";
import { getAIProvider } from "./provider-factory";
import { assertToneAllowed } from "./generation-service";
import { createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logging/logger";
import { getEntitlement } from "@/modules/billing/entitlement";
import { recordUsageDetails, releaseCredits, reserveCredits } from "@/modules/billing/credits";
import { saveToLibrary } from "@/modules/library/library-service";
import { CREDIT_COST } from "@/types";

export const repurposeInputSchema = generationInputSchema.omit({
  platform: true,
  contentType: true,
});

const TARGETS: { platform: Platform; contentType: ContentType }[] = [
  { platform: "youtube", contentType: "video" },
  { platform: "tiktok", contentType: "short" },
  { platform: "instagram", contentType: "carousel" },
];

export interface RepurposeResult {
  data: GeneratedContent[];
  projectId: string | null;
  creditsRemaining: number;
}

export async function repurposeService(userId: string, rawInput: unknown): Promise<RepurposeResult> {
  const input: z.infer<typeof repurposeInputSchema> = repurposeInputSchema.parse(rawInput);
  const requestId = input.requestId || crypto.randomUUID();

  const supabase = createAdminClient();
  const entitlement = await getEntitlement(supabase, userId);

  if (!entitlement.config.features.repurpose) {
    throw new AppError("PLAN_FEATURE", "Repurpose is available on the Creator and Growth plans.", 403);
  }
  assertToneAllowed(entitlement, input.tone);

  const provider = getAIProvider({
    tier: entitlement.config.features.qualityModel ? "quality" : "fast",
    language: input.language,
  });

  const used = await reserveCredits(supabase, entitlement, {
    requestId,
    kind: "repurpose",
    model: provider.name,
    platform: "multi",
  });

  const settled = await Promise.allSettled(
    TARGETS.map((t) => provider.generateContent({ ...input, ...t, requestId }))
  );

  const succeeded = settled.flatMap((s, i) =>
    s.status === "fulfilled" ? [{ target: TARGETS[i]!, result: s.value }] : []
  );

  if (succeeded.length === 0) {
    await releaseCredits(supabase, entitlement.workspaceId, requestId);
    const first = settled[0];
    throw first?.status === "rejected" ? first.reason : new Error("Repurpose failed.");
  }

  // Refund formats that failed
  const charged = succeeded.length;
  if (charged < CREDIT_COST.repurpose) {
    const { error } = await supabase
      .from("generation_usage")
      .update({ credits_used: charged })
      .eq("workspace_id", entitlement.workspaceId)
      .eq("request_id", requestId);
    if (error) logger.error("Failed to refund partial repurpose", { requestId, error: error.message });
  }

  await recordUsageDetails(
    supabase,
    entitlement.workspaceId,
    requestId,
    [...new Set(succeeded.map((s) => s.result.providerName))].join(","),
    succeeded.reduce(
      (sum, s) => ({
        promptCount: sum.promptCount + s.result.usage.promptCount,
        completionCount: sum.completionCount + s.result.usage.completionCount,
      }),
      { promptCount: 0, completionCount: 0 }
    )
  );

  const projectId = await saveToLibrary(
    supabase,
    entitlement.workspaceId,
    input,
    succeeded.map((s) => ({ contentType: s.target.contentType, content: s.result.data }))
  );

  const usedAfterRefund = used - (CREDIT_COST.repurpose - charged);
  return {
    data: succeeded.map((s) => s.result.data),
    projectId,
    creditsRemaining: Math.max(0, entitlement.config.credits - usedAfterRefund),
  };
}
