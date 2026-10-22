"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Search, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt, locale } from "@/lib/i18n/format";
import { apiFetch, ApiError, isUpgradeError } from "@/lib/queries/client";
import { useRefreshAfterSpend } from "@/lib/queries/hooks";
import { useUpgrade } from "@/components/billing/upgrade-provider";
import { PillTabs } from "@/components/dashboard/pill-tabs";
import { RingGauge } from "@/components/dashboard/ring-gauge";
import { scoreSeo } from "@/modules/seo/seo-score";
import type { CompetitorResult } from "@/modules/seo/competitor-service";
import type { VideoPackage } from "@/modules/ai/video-schemas";
import { CopyButton } from "./copy-button";

export function SeoPanel({ pkg }: { pkg: VideoPackage }) {
  const { t, language } = useLanguage();
  const { openUpgrade } = useUpgrade();
  const refreshAfterSpend = useRefreshAfterSpend();
  const [titleIndex, setTitleIndex] = useState(0);
  const [keyword, setKeyword] = useState(pkg.youtube.tags[0] ?? pkg.detected.niche);
  const [research, setResearch] = useState<CompetitorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = pkg.youtube.titles[titleIndex]?.text ?? "";
  const result = useMemo(
    () =>
      scoreSeo({
        title,
        description: pkg.youtube.description,
        tags: pkg.youtube.tags,
        hashtags: pkg.youtube.hashtags,
        keyword,
        competitorTerms: research?.commonTerms,
      }),
    [title, keyword, pkg, research]
  );

  const findCompetitors = async () => {
    setError(null);
    setLoading(true);
    try {
      const json = await apiFetch<CompetitorResult & { success: true }>("/api/video/seo", {
        method: "POST",
        body: JSON.stringify({
          keyword,
          language: pkg.detected.language,
          titles: pkg.youtube.titles.map((x) => x.text),
          tags: pkg.youtube.tags,
          requestId: crypto.randomUUID(),
        }),
      });
      setResearch(json);
      refreshAfterSpend();
    } catch (err) {
      if (isUpgradeError(err)) openUpgrade(err.message);
      else setError(err instanceof ApiError || err instanceof Error ? err.message : t.app.somethingWrong ?? "");
    } finally {
      setLoading(false);
    }
  };

  const numberFormat = new Intl.NumberFormat(locale(language), { notation: "compact" });
  const tone = result.score >= 80 ? "positive" : result.score >= 55 ? "sage" : "negative";

  return (
    <div className="space-y-4">
      {/* Score + checklist */}
      <section className="space-y-4 rounded-xl bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center gap-5">
          <RingGauge value={result.score} label={String(result.score)} caption="/ 100" tone={tone} aria-label={t.app.seoScore} />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-lg font-bold">{t.app.seoScore}</h3>
            <p className="text-sm text-muted-foreground">{t.app.seoScoreNote}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">{t.app.seoTitle}</p>
            <PillTabs
              size="sm"
              aria-label={t.app.seoTitle}
              value={String(titleIndex)}
              onValueChange={(v) => setTitleIndex(Number(v))}
              className="bg-muted shadow-none"
              options={pkg.youtube.titles.map((x, i) => ({ value: String(i), label: x.style }))}
            />
            <p className="text-sm font-medium" dir="auto">{title}</p>
          </div>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">{t.app.seoKeyword}</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              dir="auto"
              maxLength={100}
              className="h-10 w-full rounded-full bg-muted px-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
        </div>

        <ul className="divide-y divide-border">
          {result.checks.map((check) => (
            <li key={check.id} className="flex items-start gap-3 py-2.5">
              {check.passed ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-negative" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {t.app[`seo_${check.id}`]}
                  {check.detail && <span className="ms-2 text-xs text-muted-foreground tabular-nums">{check.detail}</span>}
                </p>
                {!check.passed && <p className="text-xs text-muted-foreground">{t.app[`seoTip_${check.id}`]}</p>}
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {check.points}/{check.maxPoints}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Competitor research */}
      <section className="space-y-4 rounded-xl bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{t.app.competitorsTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.app.competitorsBody}</p>
          </div>
          <button
            type="button"
            onClick={findCompetitors}
            disabled={loading || keyword.trim().length < 2}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {loading ? t.app.competitorsLoading : t.app.competitorsButton}
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-negative-soft p-3 text-sm text-negative">
            {error}
          </p>
        )}

        {research && research.competitors.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.app.competitorsNone}</p>
        )}

        {research && research.competitors.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <ol className="space-y-2">
              {research.competitors.map((c) => (
                <li key={c.videoId} className="flex items-start gap-3 rounded-lg bg-muted p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" dir="auto">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.channel}
                      {c.views != null && ` · ${fmt(t.app.viewsCount, { n: numberFormat.format(c.views) })}`}
                    </p>
                  </div>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={c.title}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-card hover:bg-accent"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </li>
              ))}
            </ol>

            <div className="space-y-4">
              {research.commonTerms.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">{t.app.commonTerms}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {research.commonTerms.map((term) => (
                      <span key={term} className="rounded-full bg-sage-softer px-2.5 py-1 text-xs text-sage">{term}</span>
                    ))}
                  </div>
                </div>
              )}

              {research.suggestions && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">{t.app.rankingTitles}</p>
                    {research.suggestions.rankingTitles.map((s) => (
                      <div key={s.text} className="flex items-start gap-3 rounded-lg bg-muted p-3">
                        <div className="min-w-0 flex-1" dir="auto">
                          <p className="text-sm font-semibold">{s.text}</p>
                          <p className="text-xs text-muted-foreground">{s.why}</p>
                        </div>
                        <CopyButton text={s.text} />
                      </div>
                    ))}
                  </div>
                  {research.suggestions.missingKeywords.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">{t.app.missingKeywords}</p>
                      <div className="flex flex-wrap gap-1.5" dir="auto">
                        {research.suggestions.missingKeywords.map((k) => (
                          <span key={k} className={cn("rounded-full bg-negative-soft px-2.5 py-1 text-xs text-negative")}>{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-muted-foreground">{t.app.descriptionOpening}</p>
                      <CopyButton text={research.suggestions.descriptionOpening} />
                    </div>
                    <p className="rounded-lg bg-muted p-3 text-sm" dir="auto">{research.suggestions.descriptionOpening}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
