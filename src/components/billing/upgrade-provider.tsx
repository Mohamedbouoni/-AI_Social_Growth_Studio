"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { useCheckout, useUsage } from "@/lib/queries/hooks";
import type { PaidPlan } from "@/types";
import { PaymentMethodsNote, PlanCards } from "./plan-cards";

// =============================================================================
// Paywall — opened when credits run out (LIMIT_REACHED) or a paid feature is
// used (PLAN_FEATURE). Any dashboard component can call useUpgrade().
// =============================================================================

interface UpgradeContextType {
  /** Opens the dialog; `reason` is the server's message, shown on top. */
  openUpgrade: (reason?: string) => void;
}

const UpgradeContext = createContext<UpgradeContextType | undefined>(undefined);

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [pendingPlan, setPendingPlan] = useState<PaidPlan | null>(null);
  const checkout = useCheckout();

  const value = useMemo<UpgradeContextType>(
    () => ({
      openUpgrade: (nextReason) => {
        setReason(nextReason);
        setOpen(true);
      },
    }),
    []
  );

  const choose = (plan: PaidPlan) => {
    setPendingPlan(plan);
    checkout.mutate(plan, { onError: () => setPendingPlan(null) });
  };

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity duration-200 supports-backdrop-filter:backdrop-blur-[2px] data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-background p-5 text-foreground shadow-float outline-none transition-[scale,opacity] duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:p-7">
            <div className="mb-5 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-xl font-bold">
                  {t.app.upgradeTitle}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {reason ?? t.app.upgradeBody}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                aria-label={t.shell.close}
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-card text-foreground shadow-card transition-colors hover:bg-muted"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>

            <UpgradePlans pendingPlan={pendingPlan} onChoose={choose} />

            {checkout.error && (
              <p role="alert" className="mt-4 text-center text-sm text-negative">
                {checkout.error.message}
              </p>
            )}
            <PaymentMethodsNote className="mt-4" />
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </UpgradeContext.Provider>
  );
}

// Mounted only while the dialog is open, so the usage query never runs during prerender
function UpgradePlans({
  pendingPlan,
  onChoose,
}: {
  pendingPlan: PaidPlan | null;
  onChoose: (plan: PaidPlan) => void;
}) {
  const { data: usage } = useUsage();
  return <PlanCards paidOnly currentPlan={usage?.plan} pendingPlan={pendingPlan} onChoose={onChoose} />;
}

export function useUpgrade() {
  const context = useContext(UpgradeContext);
  if (!context) {
    throw new Error("useUpgrade must be used within an UpgradeProvider");
  }
  return context;
}
