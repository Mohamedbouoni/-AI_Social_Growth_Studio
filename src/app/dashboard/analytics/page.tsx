"use client";

import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, Info, Wand2, Zap } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt, formatDate, toIsoDate } from "@/lib/i18n/format";
import { useUsageHistory, type UsageEvent } from "@/lib/queries/hooks";
import { PLATFORM_NAMES, PlatformIcon } from "@/lib/content";
import { StatTile } from "@/components/dashboard/stat-tile";
import type { SocialPlatform, UsageKind } from "@/types";

const DAYS = 30;

function lastDays(events: UsageEvent[], days: number) {
  const today = new Date();
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i));
    return { date: toIsoDate(d), credits: 0 };
  });
  const index = new Map(buckets.map((b, i) => [b.date, i]));
  for (const e of events) {
    const i = index.get(toIsoDate(new Date(e.created_at)));
    if (i !== undefined) buckets[i]!.credits += e.credits_used;
  }
  return buckets;
}

/** Labelled horizontal bars for a single measure across a few categories */
function BreakdownBars({ rows }: { rows: { key: string; label: React.ReactNode; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <li key={r.key} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 font-medium">{r.label}</span>
            <span className="font-semibold tabular-nums">{r.value}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-chart-mark transition-[width] duration-500"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  const { t, language } = useLanguage();
  const { data: events = [], isLoading } = useUsageHistory();

  const daily = useMemo(() => lastDays(events, DAYS), [events]);

  const summary = useMemo(() => {
    const byPlatform: Record<SocialPlatform, number> = { youtube: 0, tiktok: 0, instagram: 0 };
    const byKind: Record<UsageKind, number> = { generation: 0, repurpose: 0, assistant: 0, video: 0 };
    let total = 0;
    for (const e of events) {
      total += e.credits_used;
      // Count actions, not credits: repurpose and video cost several credits each
      byKind[e.kind] += e.kind === "repurpose" || e.kind === "video" ? 1 : e.credits_used;
      if (e.platform in byPlatform) byPlatform[e.platform as SocialPlatform] += 1;
      // A repurpose produces one piece for every platform
      if (e.kind === "repurpose") for (const p of Object.keys(byPlatform) as SocialPlatform[]) byPlatform[p] += 1;
    }
    const busiest = [...daily].sort((a, b) => b.credits - a.credits)[0];
    return { byPlatform, byKind, total, busiest: busiest && busiest.credits > 0 ? busiest : null };
  }, [events, daily]);

  if (!isLoading && events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-12 text-center shadow-card">
        <p className="text-muted-foreground">{t.app.noUsage}</p>
      </div>
    );
  }

  const shortDate = (iso: string) => formatDate(`${iso}T00:00:00`, language, { day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={Zap} label={t.app.totalCredits90 ?? ""} value={summary.total} />
        <StatTile icon={Wand2} label={t.app.kindGeneration ?? ""} value={summary.byKind.generation} />
        <StatTile
          icon={CalendarDays}
          label={t.app.busiestDay ?? ""}
          value={summary.busiest ? shortDate(summary.busiest.date) : "—"}
          hint={summary.busiest ? fmt(t.app.creditsN, { n: summary.busiest.credits }) : undefined}
        />
      </div>

      {/* Single series: the title names it, so no legend */}
      <section className="rounded-xl bg-card p-5 shadow-card sm:p-6">
        <h3 className="mb-4 text-lg font-bold">{t.app.creditsLast30}</h3>
        <div className="h-64" dir="ltr">
          {isLoading ? (
            <div className="h-full animate-pulse rounded-lg bg-muted" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  interval={6}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as { date: string; credits: number } | undefined;
                    if (!active || !point) return null;
                    return (
                      <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-float">
                        <p className="text-muted-foreground">{shortDate(point.date)}</p>
                        <p className="font-semibold tabular-nums">{fmt(t.app.creditsN, { n: point.credits })}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="credits" fill="var(--chart-mark)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Table view of the same data for screen readers and exact values */}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground">{t.app.table}</summary>
          <table className="mt-2 w-full text-xs">
            <tbody>
              {daily
                .filter((d) => d.credits > 0)
                .map((d) => (
                  <tr key={d.date} className="border-b border-border">
                    <td className="py-1">{shortDate(d.date)}</td>
                    <td className="py-1 text-end tabular-nums">{d.credits}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl bg-card p-5 shadow-card sm:p-6">
          <h3 className="mb-4 text-lg font-bold">{t.app.byPlatform}</h3>
          <BreakdownBars
            rows={(Object.keys(summary.byPlatform) as SocialPlatform[]).map((p) => ({
              key: p,
              label: (
                <>
                  <PlatformIcon platform={p} className="size-4" />
                  {PLATFORM_NAMES[p]}
                </>
              ),
              value: summary.byPlatform[p],
            }))}
          />
        </section>
        <section className="rounded-xl bg-card p-5 shadow-card sm:p-6">
          <h3 className="mb-4 text-lg font-bold">{t.app.byAction}</h3>
          <BreakdownBars
            rows={[
              { key: "generation", label: t.app.kindGeneration, value: summary.byKind.generation },
              { key: "repurpose", label: t.app.kindRepurpose, value: summary.byKind.repurpose },
              { key: "assistant", label: t.app.kindAssistant, value: summary.byKind.assistant },
              { key: "video", label: t.app.kindVideo, value: summary.byKind.video },
            ]}
          />
        </section>
      </div>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0" />
        {t.app.analyticsNote}
      </p>
    </div>
  );
}
