// =============================================================================
// Payment Service — Konnect checkout and verification
// =============================================================================
// Flow: createCheckout() stores a pending payment and returns Konnect's payUrl.
// Konnect then calls our webhook (GET ?payment_ref=...) and redirects the
// payer back to /dashboard/billing, which calls syncPendingPayments(). Both
// paths end in verifyPayment(), which trusts only Konnect's API, never the
// incoming request.
// =============================================================================

import { createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logging/logger";
import { PLAN_DURATION_DAYS, PLANS, type PaidPlan, type Payment } from "@/types";
import { getEntitlement } from "./entitlement";
import { getKonnectPayment, initKonnectPayment } from "./konnect";

export type VerifyOutcome = "activated" | "already_completed" | "pending" | "failed" | "unknown";

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function createCheckout(
  userId: string,
  plan: PaidPlan,
  payer: { email?: string; name?: string }
): Promise<{ payUrl: string }> {
  const supabase = createAdminClient();
  const { workspaceId } = await getEntitlement(supabase, userId);
  const amount = PLANS[plan].priceMillimes;

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({ workspace_id: workspaceId, plan, amount_millimes: amount })
    .select("id")
    .single();

  if (error || !payment) {
    throw new Error(`Could not create payment: ${error?.message}`);
  }

  const [firstName, ...rest] = (payer.name ?? "").trim().split(/\s+/);
  const base = appUrl();

  try {
    const { payUrl, paymentRef } = await initKonnectPayment({
      amountMillimes: amount,
      orderId: payment.id,
      description: `AI Social Growth Studio — ${plan} plan (${PLAN_DURATION_DAYS} days)`,
      webhookUrl: `${base}/api/billing/konnect/webhook`,
      successUrl: `${base}/dashboard/billing?payment=return`,
      failUrl: `${base}/dashboard/billing?payment=failed`,
      email: payer.email,
      firstName: firstName || undefined,
      lastName: rest.join(" ") || undefined,
    });

    await supabase
      .from("payments")
      .update({ provider_payment_ref: paymentRef, pay_url: payUrl })
      .eq("id", payment.id);

    return { payUrl };
  } catch (err) {
    await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
    logger.error("Konnect checkout failed", {
      paymentId: payment.id,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new AppError(
      "PAYMENT_PROVIDER",
      "The payment provider is unavailable right now. Please try again in a moment.",
      502
    );
  }
}

/** Checks a payment against Konnect and activates the plan if it was paid. */
export async function verifyPayment(paymentRef: string): Promise<VerifyOutcome> {
  const supabase = createAdminClient();

  // Only refs we issued are looked up — the webhook can't be used to make us
  // query arbitrary payments.
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("provider_payment_ref", paymentRef)
    .maybeSingle<Payment>();

  if (!payment) return "unknown";
  if (payment.status === "completed") return "already_completed";
  if (payment.status === "failed" || payment.status === "expired") return "failed";

  const remote = await getKonnectPayment(paymentRef);

  await supabase.from("billing_events").upsert(
    {
      provider_event_id: `konnect:${paymentRef}:${remote.status}`,
      event_type: `payment.${remote.status}`,
      payload: remote,
    },
    { onConflict: "provider_event_id", ignoreDuplicates: true }
  );

  if (remote.status === "completed") {
    const paid = remote.reachedAmount ?? remote.amount;
    const matches =
      remote.amount === payment.amount_millimes &&
      paid >= payment.amount_millimes &&
      (remote.token === undefined || remote.token === "TND") &&
      (remote.orderId === undefined || remote.orderId === payment.id);

    if (!matches) {
      logger.error("Konnect payment does not match our record", {
        paymentId: payment.id,
        expected: payment.amount_millimes,
        received: remote.amount,
        orderId: remote.orderId,
      });
      await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
      return "failed";
    }

    const { data, error } = await supabase.rpc("activate_plan_payment", {
      p_payment_id: payment.id,
      p_days: PLAN_DURATION_DAYS,
    });
    if (error) {
      throw new Error(`Plan activation failed: ${error.message}`);
    }

    const result = data as { status: "activated" | "already_completed" };
    logger.info("Plan payment verified", { paymentId: payment.id, plan: payment.plan, result: result.status });
    return result.status;
  }

  if (remote.expirationDate && new Date(remote.expirationDate) < new Date()) {
    await supabase.from("payments").update({ status: "expired" }).eq("id", payment.id);
    return "failed";
  }

  return "pending";
}

/** Re-checks this workspace's recent pending payments (used on return from checkout). */
export async function syncPendingPayments(userId: string): Promise<VerifyOutcome[]> {
  const supabase = createAdminClient();
  const { workspaceId } = await getEntitlement(supabase, userId);
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const { data: pending } = await supabase
    .from("payments")
    .select("provider_payment_ref")
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .not("provider_payment_ref", "is", null)
    .gte("created_at", since);

  const outcomes: VerifyOutcome[] = [];
  for (const row of pending ?? []) {
    try {
      outcomes.push(await verifyPayment(row.provider_payment_ref as string));
    } catch (err) {
      logger.error("Pending payment sync failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return outcomes;
}
