// =============================================================================
// Credits — reserve before calling the AI, release if it fails
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logging/logger";
import type { TokenUsage } from "@/modules/ai/provider";
import { CREDIT_COST, type UsageKind } from "@/types";
import type { Entitlement } from "./entitlement";

interface ReservationResult {
  status: "reserved" | "duplicate" | "limit_reached";
  used: number;
}

export interface ReserveParams {
  requestId: string;
  kind: UsageKind;
  model: string;
  platform?: string;
  contentType?: string;
}

/** Atomically reserves credits for one request. Returns credits used this cycle. */
export async function reserveCredits(
  supabase: SupabaseClient,
  entitlement: Entitlement,
  params: ReserveParams
): Promise<number> {
  const { data, error } = await supabase.rpc("reserve_credits", {
    p_workspace_id: entitlement.workspaceId,
    p_request_id: params.requestId,
    p_limit: entitlement.config.credits,
    p_credits: CREDIT_COST[params.kind],
    p_cycle_start: entitlement.cycleStart.toISOString(),
    p_kind: params.kind,
    p_model: params.model,
    p_platform: params.platform ?? "",
    p_content_type: params.contentType ?? "",
  });

  if (error) {
    throw new Error(`Credit reservation failed: ${error.message}`);
  }

  const { status, used } = data as ReservationResult;

  if (status === "duplicate") {
    // Results aren't cached by request_id, so a replay can't be served —
    // reject it instead of charging twice.
    throw new AppError(
      "DUPLICATE_REQUEST",
      "This request has already been processed. Please submit a new request.",
      409
    );
  }

  if (status === "limit_reached") {
    throw new AppError(
      "LIMIT_REACHED",
      entitlement.plan === "free"
        ? `You've used your ${entitlement.config.credits} free credits this month. Upgrade to keep creating.`
        : `You've used all ${entitlement.config.credits} credits in this cycle. Upgrade or renew to keep creating.`,
      403
    );
  }

  return used;
}

export async function releaseCredits(
  supabase: SupabaseClient,
  workspaceId: string,
  requestId: string
): Promise<void> {
  const { error } = await supabase
    .from("generation_usage")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("request_id", requestId);

  if (error) {
    logger.error("Failed to release credits", { requestId, error: error.message });
  }
}

/** Records which provider actually answered and the tokens it used. */
export async function recordUsageDetails(
  supabase: SupabaseClient,
  workspaceId: string,
  requestId: string,
  providerName: string,
  usage: TokenUsage
): Promise<void> {
  const { error } = await supabase
    .from("generation_usage")
    .update({
      model: providerName,
      tokens_in: usage.promptCount,
      tokens_out: usage.completionCount,
    })
    .eq("workspace_id", workspaceId)
    .eq("request_id", requestId);

  if (error) {
    logger.warn("Failed to record usage details", { requestId, error: error.message });
  }
}
