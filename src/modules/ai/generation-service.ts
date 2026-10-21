// =============================================================================
// AI Generation Service
// =============================================================================

import type { GeneratedContent, GenerationInput } from "./schemas";
import { generationInputSchema } from "./schemas";
import { getAIProvider } from "./provider-factory";
import type { ProviderResult } from "./provider";
import { createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logging/logger";
import { getEntitlement, type Entitlement } from "@/modules/billing/entitlement";
import { recordUsageDetails, releaseCredits, reserveCredits } from "@/modules/billing/credits";
import { saveToLibrary } from "@/modules/library/library-service";
import { FREE_TONES } from "@/types";

export interface GenerationResult {
  data: GeneratedContent;
  /** Library project the result was saved to; null if saving failed. */
  projectId: string | null;
  creditsRemaining: number;
  isCached: boolean;
}

/** Throws PLAN_FEATURE when the chosen tone needs a paid plan. */
export function assertToneAllowed(entitlement: Entitlement, tone: GenerationInput["tone"]) {
  if (
    !entitlement.config.features.allTones &&
    !(FREE_TONES as readonly string[]).includes(tone)
  ) {
    throw new AppError(
      "PLAN_FEATURE",
      `The "${tone}" tone is available on the Creator and Growth plans.`,
      403
    );
  }
}

export async function generateContentService(
  userId: string,
  rawInput: unknown
): Promise<GenerationResult> {
  // 1. Validate input schema
  const input: GenerationInput = generationInputSchema.parse(rawInput);
  const requestId = input.requestId || crypto.randomUUID();

  const supabase = createAdminClient();

  // 2. Resolve plan, credit cycle and feature gates
  const entitlement = await getEntitlement(supabase, userId);
  assertToneAllowed(entitlement, input.tone);

  const provider = getAIProvider({
    tier: entitlement.config.features.qualityModel ? "quality" : "fast",
    language: input.language,
  });

  // 3. Atomically check quota + idempotency and reserve the credit
  const used = await reserveCredits(supabase, entitlement, {
    requestId,
    kind: "generation",
    model: provider.name,
    platform: input.platform,
    contentType: input.contentType,
  });

  // 4. Invoke AI Provider — release the reserved credit if it fails
  logger.info("Executing generation with provider", {
    providerName: provider.name,
    workspaceId: entitlement.workspaceId,
  });

  let generated: ProviderResult<GeneratedContent>;
  try {
    generated = await provider.generateContent(input);
  } catch (err) {
    await releaseCredits(supabase, entitlement.workspaceId, requestId);
    throw err;
  }

  // 5. Record usage details and save to the library
  await recordUsageDetails(
    supabase,
    entitlement.workspaceId,
    requestId,
    generated.providerName,
    generated.usage
  );

  const projectId = await saveToLibrary(supabase, entitlement.workspaceId, input, [
    { contentType: input.contentType, content: generated.data },
  ]);

  return {
    data: generated.data,
    projectId,
    creditsRemaining: Math.max(0, entitlement.config.credits - used),
    isCached: false,
  };
}
