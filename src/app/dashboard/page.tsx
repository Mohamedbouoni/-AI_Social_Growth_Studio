"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, FolderOpen, Sparkles, Wand2, Zap } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt, formatDate } from "@/lib/i18n/format";
import { useLibrary, useSessionProfile, useUsage, useUsageHistory } from "@/lib/queries/hooks";
import { PLATFORM_NAMES, PlatformIcon, STATUS_STYLE, itemPlatforms, statusLabel } from "@/lib/content";
import { StatTile } from "@/components/dashboard/stat-tile";
import { RingGauge } from "@/components/dashboard/ring-gauge";
import { PillTabs } from "@/components/dashboard/pill-tabs";
import { planLabel } from "@/components/billing/plan-cards";
import { useUpgrade } from "@/components/billing/upgrade-provider";
import { cn } from "@/lib/utils";
import type { SocialPlatform } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Credits spent per day over the last `days` days, oldest first */
function dailyCredits(events: { created_at: string; credits_used: number }[], days: number): number[] {
  const buckets = new Array<number>(days).fill(0);
  const start = Date.now() - days * DAY_MS;
  for (const e of events) {
    const index = Math.floor((new Date(e.created_at).getTime() - start) / DAY_MS);
    if (index >= 0 && index < days) buckets[index]! += e.credits_used;
  }
  return buckets;
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { openUpgrade } = useUpgrade();
  const { data: usage } = useUsage();
  const { data: history = [] } = useUsageHistory();
  const { data: library = [], isLoading: libraryLoading } = useLibrary({ limit: 200 });
  const { data: profile } = useSessionProfile();

  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>("youtube");

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const cycleStart = usage ? new Date(usage.cycle.start).getTime() : 0;
    return {
      generations: history.filter(
        (e) => e.kind !== "assistant" && new Date(e.created_at).getTime() >= cycleStart
      ).length,
      drafts: library.filter((i) => i.status === "draft").length,
      scheduled: library.filter((i) => i.planned_date && i.planned_date >= today).length,
      platforms: new Set(library.flatMap(itemPlatforms)).size,
      spark: dailyCredits(history, 14),
    };
  }, [history, library, usage]);

  const usedPercent = usage ? (usage.credits.used / Math.max(1, usage.credits.limit)) * 100 : 0;
  const initials = (profile?.name ?? "C")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const launch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!idea.trim()) return;
    router.push(`/dashboard/studio?platform=${platform}&idea=${encodeURIComponent(idea.trim())}`);
  };

  return (
    <div className="space-y-6">
      {profile && (
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {fmt(t.app.greeting, { name: profile.name.split(" ")[0] ?? profile.name })}
        </h2>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Zap}
          label={t.app.creditsLeft ?? ""}
          value={usage ? usage.credits.remaining : "—"}
          hint={usage ? fmt(t.app.creditsOf, { limit: usage.credits.limit }) : undefined}
          sparkline={stats.spark}
        />
        <StatTile icon={Wand2} label={t.app.generations ?? ""} value={stats.generations} hint={t.app.thisCycle} />
        <StatTile icon={FolderOpen} label={t.app.savedDrafts ?? ""} value={stats.drafts} />
        <StatTile icon={CalendarDays} label={t.app.scheduled ?? ""} value={stats.scheduled} hint={t.app.upcoming} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Quick generate */}
        <form onSubmit={launch} className="flex flex-col gap-4 rounded-xl bg-card p-5 shadow-card sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-[1.125rem]" />
            </span>
            <h3 className="text-lg font-bold">{t.app.quickTitle}</h3>
          </div>
          <PillTabs
            size="sm"
            aria-label={t.studio.selectPlatform}
            value={platform}
            onValueChange={setPlatform}
            className="self-start shadow-none bg-muted"
            options={(["youtube", "tiktok", "instagram"] as const).map((p) => ({ value: p, label: PLATFORM_NAMES[p] }))}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder={t.app.quickPlaceholder}
              aria-label={t.app.quickTitle}
              maxLength={2000}
              className="h-12 min-w-0 flex-1 rounded-full bg-muted px-5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              disabled={!idea.trim()}
              className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 className="size-4" />
              {t.app.generate}
            </button>
          </div>
        </form>

        {/* Profile card */}
        <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-6 text-center shadow-card">
          <span className="grid size-16 place-items-center rounded-full bg-sage-soft text-xl font-bold text-sage">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{profile?.name ?? "…"}</p>
            <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
          </div>
          {usage && (
            <span className="rounded-full bg-sage-softer px-3 py-1 text-xs font-semibold text-sage">
              {planLabel(usage.plan, t)}
            </span>
          )}
          <dl className="mt-1 grid w-full grid-cols-3 gap-2 text-center">
            {[
              { label: t.nav.library, value: library.length },
              { label: t.app.scheduled, value: stats.scheduled },
              { label: t.app.platformsLabel, value: stats.platforms },
            ].map((s) => (
              <div key={s.label}>
                <dt className="truncate text-xs text-muted-foreground">{s.label}</dt>
                <dd className="text-xl font-bold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent content */}
        <section className="rounded-xl bg-card p-5 shadow-card sm:p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">{t.app.recentContent}</h3>
            <Link
              href="/dashboard/library"
              aria-label={t.app.viewAll}
              className="grid size-9 place-items-center rounded-full bg-muted transition-colors hover:bg-accent"
            >
              <ArrowUpRight className="size-4 rtl:-scale-x-100" />
            </Link>
          </div>

          {libraryLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : library.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">{t.app.emptyLibrary}</p>
              <Link
                href="/dashboard/studio"
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {t.app.openStudio}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {library.slice(0, 5).map((item) => {
                const platforms = itemPlatforms(item);
                return (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <span className="w-1 self-stretch rounded-full bg-primary/80" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.created_at, language, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="flex -space-x-1 rtl:space-x-reverse">
                      {platforms.map((p) => (
                        <span key={p} className="grid size-7 place-items-center rounded-full bg-muted ring-2 ring-card">
                          <PlatformIcon platform={p} className="size-3.5" />
                        </span>
                      ))}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_STYLE[item.status])}>
                      {statusLabel(item.status, t)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="grid gap-4">
          {/* Credit usage gauge */}
          <section className="flex items-center gap-5 rounded-xl bg-card p-5 shadow-card">
            <RingGauge value={usedPercent} aria-label={t.app.creditUsage} caption={t.app.creditsUsed} />
            <div className="min-w-0 space-y-1">
              <h3 className="font-bold">{t.app.creditUsage}</h3>
              {usage && (
                <>
                  <p className="text-sm tabular-nums">
                    {usage.credits.used} / {usage.credits.limit}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usage.passEnd
                      ? fmt(t.app.activeUntil, { date: formatDate(usage.passEnd, language) })
                      : fmt(t.app.resetsOn, { date: formatDate(usage.cycle.end, language) })}
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Upgrade card (free) or plan status (paid) */}
          <section className="bg-sage-glow flex flex-col items-center gap-3 rounded-xl p-6 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-card text-sage shadow-card">
              <Zap className="size-5" />
            </span>
            <h3 className="font-bold">{t.app.upgradeCardTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.app.upgradeCardBody}</p>
            {usage?.plan === "free" ? (
              <button
                type="button"
                onClick={() => openUpgrade()}
                className="cursor-pointer rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-sage-foreground transition-opacity hover:opacity-90"
              >
                {t.app.seePlans}
              </button>
            ) : (
              <Link
                href="/dashboard/billing"
                className="rounded-full bg-sage px-5 py-2.5 text-sm font-semibold text-sage-foreground"
              >
                {t.shell.billing}
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
