"use client";

import React, { useState } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/provider";
import { formatTime } from "@/lib/video/format";
import type { VideoPackage } from "@/modules/ai/video-schemas";

interface FeedSimulatorProps {
  pkg: VideoPackage;
  frames: string[];
  durationSeconds: number;
  channelName: string;
  /** A generated thumbnail to show instead of the raw frame */
  coverOverride?: string | null;
}

/** Mock YouTube home-feed card and Shorts screen, to compare titles visually. */
export function FeedSimulator({ pkg, frames, durationSeconds, channelName, coverOverride }: FeedSimulatorProps) {
  const { t } = useLanguage();
  const [titleIndex, setTitleIndex] = useState(0);
  const title = pkg.youtube.titles[titleIndex]?.text ?? "";
  const frameCover = frames[1] ?? frames[0];
  const cover = coverOverride ?? frameCover;
  const initial = channelName.trim().charAt(0).toUpperCase() || "C";

  return (
    <section className="rounded-xl bg-card p-5 shadow-card sm:p-6">
      <h3 className="text-lg font-bold">{t.app.feedSimulator}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{t.app.feedSimulatorBody}</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          {/* YouTube home-feed card */}
          <div className="max-w-md" dir="auto">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL from the user's own video
                <img src={cover} alt="" className="size-full object-cover" />
              )}
              {!coverOverride && pkg.youtube.thumbnails[0] && (
                <span className="absolute bottom-3 start-3 max-w-[70%] rounded-md bg-black/70 px-2 py-1 text-lg leading-tight font-black text-white uppercase">
                  {pkg.youtube.thumbnails[0].headline}
                </span>
              )}
              <span className="absolute end-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                {formatTime(durationSeconds)}
              </span>
            </div>
            <div className="mt-3 flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage-soft text-sm font-bold text-sage">
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 leading-snug font-semibold">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{channelName}</p>
                <p className="text-xs text-muted-foreground">{t.app.viewsSample}</p>
              </div>
              <MoreVertical className="size-4 shrink-0 text-muted-foreground" />
            </div>
          </div>

          <ol className="space-y-1.5">
            {pkg.youtube.titles.map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setTitleIndex(i)}
                  aria-pressed={i === titleIndex}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-start text-sm transition-colors",
                    i === titleIndex ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                  )}
                >
                  <span className="w-24 shrink-0 text-[11px] font-semibold opacity-70">{item.style}</span>
                  <span className="min-w-0 flex-1" dir="auto">{item.text}</span>
                  <span className="text-[11px] tabular-nums opacity-60">{item.text.length}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* Shorts / Reels phone screen */}
        <div className="relative mx-auto aspect-[9/16] w-full max-w-64 overflow-hidden rounded-[2rem] bg-black shadow-float" dir="auto">
          {frameCover && (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL from the user's own video
            <img src={frameCover} alt="" className="absolute inset-0 size-full object-cover opacity-90" />
          )}
          <div className="absolute inset-x-4 top-1/3 text-center">
            <span className="rounded-md bg-black/60 px-2 py-1 text-base leading-snug font-extrabold text-white">
              {pkg.short.overlays[0] ?? pkg.short.hooks[0]?.text}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 text-white">
            <p className="text-sm font-semibold">@{channelName.replace(/\s+/g, "").toLowerCase()}</p>
            <p className="line-clamp-3 text-xs">{pkg.short.caption}</p>
            <p className="truncate text-[11px] opacity-80">{pkg.short.hashtags.viral.join(" ")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
