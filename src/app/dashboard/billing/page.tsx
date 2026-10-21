"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt, formatDate, formatTnd } from "@/lib/i18n/format";
import { useBillingSync, useCheckout, usePayments, useUsage } from "@/lib/queries/hooks";
import { PaymentMethodsNote, PlanCards, planLabel } from "@/components/billing/plan-cards";
import { RingGauge } from "@/components/dashboard/ring-gauge";
import { cn } from "@/lib/utils";
import type { PaidPlan } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;
type ReturnState = "checking" | "success" | "pending" | "failed" | null;

function BillingContent() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: usage } = useUsage();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const checkout = useCheckout();
  const sync = useBillingSync();
  const [pendingPlan, setPendingPlan] = useState<PaidPlan | null>(null);
  // ?payment=return|failed is set by Konnect's redirect back to this page
  const [returnState, setReturnState] = useState<ReturnState>(() => {
    const payment = searchParams.get("payment");
    return payment === "failed" ? "failed" : payment ? "checking" : null;
  });
  const [now] = useState(() => Date.now());
  const handledReturn = useRef(false);
  const { mutate: syncPayments } = sync;

  // Coming back from Konnect: verify the payment ourselves in case the webhook is late
  useEffect(() => {
    if (handledReturn.current || !searchParams.get("payment")) return;
    handledReturn.current = true;
    router.replace("/dashboard/billing");
    if (searchParams.get("payment") === "failed") return;

    syncPayments(undefined, {
      onSuccess: ({ activated }) => setReturnState(activated ? "success" : "pending"),
      onError: () => setReturnState("pending"),
    });
  }, [searchParams, router, syncPayments]);

  const choose = (plan: PaidPlan) => {
    setPendingPlan(plan);
    checkout.mutate(plan, { onError: () => setPendingPlan(null) });
  };

  const daysLeft = usage?.passEnd ? Math.ceil((new Date(usage.passEnd).getTime() - now) / DAY_MS) : null;
  const usedPercent = usage ? (usage.credits.used / Math.max(1, usage.credits.limit)) * 100 : 0;

  const banner = {
    checking: { icon: Loader2, text: t.app.checkingPayment, style: "bg-muted text-foreground", spin: true },
    success: { icon: CheckCircle2, text: t.app.paymentSuccess, style: "bg-positive-soft text-positive" },
    pending: { icon: Clock, text: t.app.paymentPendingNote, style: "bg-sage-softer text-sage" },
    failed: { icon: XCircle, text: t.app.paymentFailed, style: "bg-negative-soft text-negative" },
  } as const;
  const activeBanner = returnState ? banner[returnState] : null;

  return (
    <div className="space-y-6">
      {activeBanner && (
        <div role="status" className={cn("flex items-center gap-3 rounded-xl p-4 text-sm font-medium", activeBanner.style)}>
          <activeBanner.icon className={cn("size-5 shrink-0", "spin" in activeBanner && "animate-spin")} />
          {activeBanner.text}
        </div>
      )}

      {daysLeft !== null && daysLeft <= 3 && (
        <div role="alert" className="flex items-center gap-3 rounded-xl bg-negative-soft p-4 text-sm font-medium text-negative">
          <AlertTriangle className="size-5 shrink-0" />
          {fmt(t.app.expiresSoon, { days: Math.max(0, daysLeft) })}
        </div>
      )}

      {/* Current plan */}
      <section className="flex flex-col gap-5 rounded-xl bg-card p-5 shadow-card sm:flex-row sm:items-center sm:p-6">
        <RingGauge value={usedPercent} aria-label={t.app.creditUsage} caption={t.app.creditsUsed} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm text-muted-foreground">{t.app.yourPlan}</p>
          <p className="text-2xl font-bold">{usage ? planLabel(usage.plan, t) : "…"}</p>
          {usage && (
            <p className="text-sm text-muted-foreground">
              {usage.credits.remaining} / {usage.credits.limit} {t.app.creditsLeft?.toLowerCase()} ·{" "}
              {usage.passEnd
                ? fmt(t.app.activeUntil, { date: formatDate(usage.passEnd, language) })
                : fmt(t.app.resetsOn, { date: formatDate(usage.cycle.end, language) })}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold">{t.app.choosePlanTitle}</h3>
          <p className="text-sm text-muted-foreground">{t.app.prepaidNote}</p>
        </div>
        <PlanCards currentPlan={usage?.plan} pendingPlan={pendingPlan} onChoose={choose} />
        {checkout.error && (
          <p role="alert" className="text-center text-sm text-negative">
            {checkout.error.message}
          </p>
        )}
        <PaymentMethodsNote />
      </section>

      <section className="rounded-xl bg-card p-5 shadow-card sm:p-6">
        <h3 className="mb-4 text-lg font-bold">{t.app.paymentHistory}</h3>
        {paymentsLoading ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.app.noPayments}</p>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{planLabel(p.plan, t)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.created_at, language)}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    p.status === "completed" ? "bg-positive-soft text-positive" : "bg-muted text-muted-foreground"
                  )}
                >
                  {p.status === "completed" ? t.app.statusCompleted : p.status === "pending" ? t.app.statusPending : t.app.statusExpired}
                </span>
                <span className="w-20 text-end font-semibold tabular-nums">{formatTnd(p.amount_millimes, t.app.currency ?? "TND")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-card shadow-card" />}>
      <BillingContent />
    </Suspense>
  );
}
