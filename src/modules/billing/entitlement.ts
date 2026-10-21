// =============================================================================
// Entitlement — which plan a workspace is on and its current credit cycle
// =============================================================================
// The subscriptions row is the source of truth: a paid plan applies only while
// its prepaid pass is active. Credit cycles are the calendar month (UTC) on
// the free plan, and consecutive 30-day cycles from the pass start on paid
// plans, so renewing a pass early never merges two months of usage.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { PLAN_DURATION_DAYS, PLANS, isPaidPlan, type Plan, type PlanConfig } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Entitlement {
  workspaceId: string;
  plan: Plan;
  config: PlanConfig;
  cycleStart: Date;
  cycleEnd: Date;
  /** End of the prepaid pass; null on the free plan. */
  passEnd: Date | null;
}

export function computeCycle(
  now: Date,
  pass: { start: Date; end: Date } | null
): { start: Date; end: Date } {
  if (!pass) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { start, end };
  }

  const cycleMs = PLAN_DURATION_DAYS * DAY_MS;
  const index = Math.max(0, Math.floor((now.getTime() - pass.start.getTime()) / cycleMs));
  const start = new Date(pass.start.getTime() + index * cycleMs);
  const end = new Date(Math.min(start.getTime() + cycleMs, pass.end.getTime()));
  return { start, end };
}

export async function getEntitlement(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<Entitlement> {
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (workspaceError) {
    throw new Error(`Workspace lookup failed: ${workspaceError.message}`);
  }
  if (!workspace) {
    throw new AppError("NOT_FOUND", "No active workspace found for user.", 404);
  }

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_start, current_period_end")
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (subError) {
    throw new Error(`Subscription lookup failed: ${subError.message}`);
  }

  const passStart = sub?.current_period_start ? new Date(sub.current_period_start) : null;
  const passEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const passActive =
    sub?.status === "active" &&
    isPaidPlan(sub.plan) &&
    passStart !== null &&
    passEnd !== null &&
    passEnd > now;

  const plan: Plan = passActive ? (sub.plan as Plan) : "free";
  const cycle = computeCycle(now, passActive ? { start: passStart, end: passEnd } : null);

  return {
    workspaceId: workspace.id,
    plan,
    config: PLANS[plan],
    cycleStart: cycle.start,
    cycleEnd: cycle.end,
    passEnd: passActive ? passEnd : null,
  };
}

export async function getCreditsUsed(
  supabase: SupabaseClient,
  workspaceId: string,
  cycleStart: Date
): Promise<number> {
  const { data, error } = await supabase
    .from("generation_usage")
    .select("credits_used")
    .eq("workspace_id", workspaceId)
    .gte("created_at", cycleStart.toISOString());

  if (error) {
    throw new Error(`Usage lookup failed: ${error.message}`);
  }
  return (data ?? []).reduce((sum, row) => sum + (row.credits_used ?? 0), 0);
}
