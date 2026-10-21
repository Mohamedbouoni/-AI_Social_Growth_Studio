"use client";

import React from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt, formatTnd } from "@/lib/i18n/format";
import type { TranslationData } from "@/lib/i18n/translations";
import { PLANS, type PaidPlan, type Plan } from "@/types";

export function planLabel(plan: Plan, t: TranslationData): string {
  return { free: t.app.planFree, creator: t.app.planCreator, growth: t.app.planGrowth }[plan]!;
}

function featureLines(plan: Plan, t: TranslationData): string[] {
  const { credits, features } = PLANS[plan];
  return [
    fmt(plan === "free" ? t.app.featFreeCredits! : t.app.featCredits!, { n: credits }),
    features.allTones ? t.app.featAllTones! : t.app.featFourTones!,
    features.qualityModel ? t.app.featQualityModel! : t.app.featFastModel!,
    t.app.featCoach!,
    t.app.featLibrary!,
    ...(features.repurpose ? [t.app.featRepurpose!] : []),
    ...(features.exportLibrary ? [t.app.featExport!] : []),
  ];
}

interface PlanCardsProps {
  currentPlan?: Plan;
  /** Plan whose checkout is starting (shows a spinner) */
  pendingPlan?: PaidPlan | null;
  onChoose: (plan: PaidPlan) => void;
  /** Hide the free card (e.g. inside the upgrade dialog) */
  paidOnly?: boolean;
}

const ORDER: Plan[] = ["free", "creator", "growth"];

export function PlanCards({ currentPlan, pendingPlan, onChoose, paidOnly }: PlanCardsProps) {
  const { t } = useLanguage();
  const plans = paidOnly ? ORDER.filter((p) => p !== "free") : ORDER;

  return (
    <div className={cn("grid gap-4", paidOnly ? "sm:grid-cols-2" : "md:grid-cols-3")}>
      {plans.map((plan) => {
        const isCurrent = plan === currentPlan;
        const highlighted = plan === "creator";
        const price = PLANS[plan].priceMillimes;

        return (
          <div
            key={plan}
            className={cn(
              "relative flex flex-col gap-5 rounded-xl p-6",
              highlighted
                ? "bg-primary text-primary-foreground shadow-float"
                : "bg-card text-card-foreground shadow-card"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold">{planLabel(plan, t)}</h3>
              {highlighted && (
                <span className="rounded-full bg-sage px-2.5 py-1 text-[11px] font-semibold text-sage-foreground">
                  {t.app.mostPopular}
                </span>
              )}
              {isCurrent && !highlighted && (
                <span className="rounded-full bg-sage-softer px-2.5 py-1 text-[11px] font-semibold text-sage">
                  {t.app.currentPlan}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tracking-tight tabular-nums">
                {price === 0 ? `${t.app.freePrice} ${t.app.currency}` : formatTnd(price, t.app.currency!)}
              </span>
              {price > 0 && (
                <span className={cn("text-sm", highlighted ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {t.app.perPass}
                </span>
              )}
            </div>

            <ul className="flex-1 space-y-2.5 text-sm">
              {featureLines(plan, t).map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className={cn("mt-0.5 size-4 shrink-0", highlighted ? "text-sage-soft" : "text-sage")} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {plan !== "free" && (
              <button
                type="button"
                disabled={Boolean(pendingPlan)}
                onClick={() => onChoose(plan as PaidPlan)}
                className={cn(
                  "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
                  highlighted ? "bg-sage text-sage-foreground" : "bg-primary text-primary-foreground"
                )}
              >
                {pendingPlan === plan ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t.app.redirecting}
                  </>
                ) : isCurrent ? (
                  t.app.renew
                ) : (
                  fmt(t.app.choosePlan!, { plan: planLabel(plan, t) })
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PaymentMethodsNote({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <p className={cn("text-center text-xs text-muted-foreground", className)}>
      {t.app.payWithKonnect} · {t.app.paymentMethods}
    </p>
  );
}
