"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/provider";
import { formatTime } from "@/lib/video/format";
import { PillTabs } from "@/components/dashboard/pill-tabs";
import { RingGauge } from "@/components/dashboard/ring-gauge";
import type { TranscriptSegment, VideoPackage } from "@/modules/ai/video-schemas";
import { CopyButton } from "./copy-button";
import { SeoPanel } from "./seo-panel";

type Tab = "youtube" | "seo" | "shorts" | "social" | "timeline" | "transcript";

function Block({ title, copy, children }: { title: string; copy?: string; children: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <section className="space-y-3 rounded-xl bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold">{title}</h4>
        {copy && <CopyButton text={copy} label={t.app.copyAll} />}
      </div>
      {children}
    </section>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" dir="auto">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-sage-softer px-2.5 py-1 text-xs text-sage">
          {item}
        </span>
      ))}
    </div>
  );
}

function StyledList({ items }: { items: { style: string; text: string }[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 rounded-lg bg-muted p-3">
          <span className="mt-0.5 w-28 shrink-0 text-[11px] font-semibold text-muted-foreground uppercase">{item.style}</span>
          <span className="min-w-0 flex-1 text-sm" dir="auto">{item.text}</span>
          <CopyButton text={item.text} />
        </li>
      ))}
    </ul>
  );
}

interface VideoResultsProps {
  pkg: VideoPackage;
  segments: TranscriptSegment[];
  durationSeconds: number;
  /** Built-in dev sample: show a warning so it is never mistaken for a real analysis */
  isSample?: boolean;
}

export function VideoResults({ pkg, segments, durationSeconds, isSample }: VideoResultsProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("youtube");
  const { detected, youtube, short, social } = pkg;
  const language = detected.dialect ? `${detected.languageName} (${detected.dialect})` : detected.languageName;

  return (
    <div className="space-y-6">
      {isSample && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-negative bg-negative-soft p-4 text-negative">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">{t.app.sampleTitle}</p>
            <p className="text-sm">{t.app.sampleBody}</p>
          </div>
        </div>
      )}

      {/* Summary header */}
      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4 rounded-xl bg-card p-5 shadow-card sm:p-6">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t.app.detectedLanguage, value: language },
              { label: t.app.detectedNiche, value: detected.subNiche ? `${detected.niche} · ${detected.subNiche}` : detected.niche },
              { label: t.app.detectedTone, value: detected.tone },
              { label: t.app.durationLabel, value: formatTime(durationSeconds) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-muted p-3">
                <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
                <dd className="truncate text-sm font-semibold" title={item.value} dir="auto">{item.value}</dd>
              </div>
            ))}
          </dl>
          <dl className="space-y-2 text-sm" dir="auto">
            <div><dt className="inline font-semibold">{t.app.takeaway}: </dt><dd className="inline">{pkg.core.takeaway}</dd></div>
            <div><dt className="inline font-semibold">{t.app.problemLabel}: </dt><dd className="inline">{pkg.core.problem}</dd></div>
            <div><dt className="inline font-semibold">{t.app.audienceLabel}: </dt><dd className="inline">{pkg.core.audience}</dd></div>
          </dl>
        </div>

        <div className="flex gap-4 rounded-xl bg-card p-5 shadow-card">
          <RingGauge
            value={pkg.hook.score}
            label={String(pkg.hook.score)}
            caption="/ 100"
            tone={pkg.hook.score >= 70 ? "positive" : pkg.hook.score >= 45 ? "sage" : "negative"}
            aria-label={t.app.hookScore}
          />
          <div className="min-w-0 space-y-2">
            <p className="font-bold">{t.app.hookScore}</p>
            <p className="text-xs text-muted-foreground">{t.app.hookEstimate}</p>
            <ul className="list-disc space-y-0.5 ps-4 text-xs" dir="auto">
              {pkg.hook.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl bg-sage-softer p-4 text-sm" dir="auto">
        <span className="font-semibold text-sage">{t.app.improvedHook}:</span>
        <span className="min-w-0 flex-1">{pkg.hook.improvedHook}</span>
        <CopyButton text={pkg.hook.improvedHook} />
      </div>

      <PillTabs
        aria-label={t.app.tabYoutube}
        value={tab}
        onValueChange={setTab}
        options={[
          { value: "youtube", label: t.app.tabYoutube ?? "" },
          { value: "seo", label: t.app.tabSeo ?? "" },
          { value: "shorts", label: t.app.tabShorts ?? "" },
          { value: "social", label: t.app.tabSocial ?? "" },
          { value: "timeline", label: t.app.tabTimeline ?? "" },
          { value: "transcript", label: t.app.tabTranscript ?? "" },
        ]}
      />

      {tab === "youtube" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Block title={t.app.titlesLabel ?? ""} copy={youtube.titles.map((x) => x.text).join("\n")}>
            <StyledList items={youtube.titles} />
          </Block>
          <Block title={t.app.descriptionLabel ?? ""} copy={youtube.description}>
            <p className="text-sm whitespace-pre-wrap" dir="auto">{youtube.description}</p>
          </Block>
          <Block title={t.app.tagsLabel ?? ""} copy={youtube.tags.join(", ")}>
            <Chips items={youtube.tags} />
          </Block>
          <Block title={t.app.hashtagsLabel ?? ""} copy={youtube.hashtags.join(" ")}>
            <Chips items={youtube.hashtags} />
          </Block>
          <div className="lg:col-span-2">
            <Block title={t.app.thumbnailIdeas ?? ""}>
              <div className="grid gap-3 sm:grid-cols-3">
                {youtube.thumbnails.map((th, i) => (
                  <div key={i} className="space-y-1.5 rounded-lg bg-muted p-3" dir="auto">
                    <p className="text-lg leading-tight font-black uppercase">{th.headline}</p>
                    <p className="text-xs"><span className="font-semibold">😮 </span>{th.expression}</p>
                    <p className="text-xs text-muted-foreground">{th.layout}</p>
                  </div>
                ))}
              </div>
            </Block>
          </div>
        </div>
      )}

      {tab === "seo" && <SeoPanel pkg={pkg} />}

      {tab === "shorts" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Block title={t.app.hooksLabel ?? ""} copy={short.hooks.map((h) => h.text).join("\n")}>
            <StyledList items={short.hooks} />
          </Block>
          <Block title={t.app.captionLabel ?? ""} copy={`${short.caption}\n\n${[...short.hashtags.viral, ...short.hashtags.niche, ...short.hashtags.micro].join(" ")}`}>
            <p className="text-sm whitespace-pre-wrap" dir="auto">{short.caption}</p>
          </Block>
          <Block title={t.app.hashtagsLabel ?? ""}>
            {(
              [
                [t.app.viralLabel, short.hashtags.viral],
                [t.app.nicheTagsLabel, short.hashtags.niche],
                [t.app.microLabel, short.hashtags.micro],
              ] as const
            ).map(([label, tags]) => (
              <div key={label} className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                <Chips items={[...tags]} />
              </div>
            ))}
          </Block>
          <Block title={t.app.overlaysLabel ?? ""} copy={short.overlays.join("\n")}>
            <ol className="list-decimal space-y-1 ps-5 text-sm" dir="auto">
              {short.overlays.map((o) => <li key={o}>{o}</li>)}
            </ol>
          </Block>
        </div>
      )}

      {tab === "social" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Block title={t.app.xThread ?? ""} copy={social.xThread.join("\n\n")}>
            <ol className="space-y-2">
              {social.xThread.map((tweet, i) => (
                <li key={i} className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap" dir="auto">{tweet}</li>
              ))}
            </ol>
          </Block>
          <Block title={t.app.linkedinPost ?? ""} copy={social.linkedinPost}>
            <p className="text-sm whitespace-pre-wrap" dir="auto">{social.linkedinPost}</p>
          </Block>
        </div>
      )}

      {tab === "timeline" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Block title={t.app.chaptersLabel ?? ""} copy={pkg.chapters.map((c) => `${c.time} ${c.title}`).join("\n")}>
            <ol className="space-y-1.5 text-sm" dir="auto">
              {pkg.chapters.map((c) => (
                <li key={`${c.time}-${c.title}`} className="flex gap-3">
                  <span className="w-12 shrink-0 font-semibold tabular-nums text-sage">{c.time}</span>
                  <span>{c.title}</span>
                </li>
              ))}
            </ol>
          </Block>
          <Block title={t.app.cueSheet ?? ""} copy={pkg.cueSheet.map((c) => `${c.time} [${c.action}] ${c.note}`).join("\n")}>
            <table className="w-full text-sm" dir="auto">
              <tbody>
                {pkg.cueSheet.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2 pe-3 align-top font-semibold tabular-nums text-sage">{c.time}</td>
                    <td className="py-2 pe-3 align-top">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase">{c.action}</span>
                    </td>
                    <td className="py-2 align-top">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Block>
        </div>
      )}

      {tab === "transcript" && (
        <Block title={t.app.tabTranscript ?? ""} copy={segments.map((s) => `[${formatTime(s.start)}] ${s.text}`).join("\n")}>
          <ol className="max-h-[28rem] space-y-1.5 overflow-y-auto text-sm" dir="auto">
            {segments.map((s, i) => (
              <li key={i} className={cn("flex gap-3")}>
                <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{formatTime(s.start)}</span>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        </Block>
      )}
    </div>
  );
}
