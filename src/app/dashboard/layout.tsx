"use client";

import React, { Suspense } from "react";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Sparkles } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { CoachProvider, useCoach } from "@/components/dashboard/coach-drawer";
import { QueryProvider } from "@/components/providers/query-provider";
import { SetupBanner } from "@/components/dashboard/setup-banner";
import { UpgradeProvider } from "@/components/billing/upgrade-provider";
import { useLanguage } from "@/lib/i18n/provider";

function AskCoachPill() {
  const { t } = useLanguage();
  const { openCoach } = useCoach();

  return (
    <button
      type="button"
      onClick={() => openCoach()}
      aria-label={t.shell.askCoach}
      className="fixed end-4 bottom-24 z-40 inline-flex h-14 cursor-pointer items-center gap-2.5 rounded-full bg-primary ps-2 pe-2 text-primary-foreground shadow-float transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 sm:pe-5 md:end-6 md:bottom-6"
    >
      <span className="grid size-10 place-items-center rounded-full bg-sage text-sage-foreground">
        <Sparkles className="size-5" />
      </span>
      <span className="hidden text-sm font-semibold sm:inline">{t.shell.askCoach}</span>
    </button>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dir } = useLanguage();

  return (
    // Base UI needs the direction to place tooltips and menus on the right side in RTL
    <DirectionProvider direction={dir}>
      <QueryProvider>
        {/* Upgrade wraps Coach: running out of credits mid-chat opens the paywall */}
        <UpgradeProvider>
          <CoachProvider>
            <div className="min-h-screen bg-background text-foreground">
              <DashboardSidebar />

              {/* Rail is 5rem wide + 1rem inset, so content starts at 8rem on desktop */}
              <div className="px-4 pt-5 pb-28 sm:px-6 md:ps-32 md:pe-8 md:pt-6 md:pb-12">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:gap-8">
                  <DashboardTopbar />
                  {/* Pages read live data and the clock on first render; Suspense lets
                      Cache Components prerender the shell and defer the page body */}
                  <main className="min-w-0">
                    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-card shadow-card" />}>
                      <SetupBanner />
                      {children}
                    </Suspense>
                  </main>
                </div>
              </div>

              <AskCoachPill />
            </div>
          </CoachProvider>
        </UpgradeProvider>
      </QueryProvider>
    </DirectionProvider>
  );
}
