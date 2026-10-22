"use client";

import React, { useEffect, useState } from "react";
import { Download, Eye, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { generateThumbnails, type GeneratedThumbnail, type ThumbnailIdea, type ThumbnailStage } from "@/lib/video/thumbnails";

interface ThumbnailStudioProps {
  file: File;
  durationSeconds: number;
  ideas: ThumbnailIdea[];
  /** Called with the chosen thumbnail URL so the feed simulator can show it */
  onPreview: (url: string) => void;
}

export function ThumbnailStudio({ file, durationSeconds, ideas, onPreview }: ThumbnailStudioProps) {
  const { t } = useLanguage();
  const [stage, setStage] = useState<ThumbnailStage | null>(null);
  const [thumbnails, setThumbnails] = useState<GeneratedThumbnail[]>([]);
  const [faceFound, setFaceFound] = useState(true);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Thumbnails are object URLs; free them when replaced or on leave
  useEffect(() => () => thumbnails.forEach((th) => URL.revokeObjectURL(th.url)), [thumbnails]);

  const stageLabel: Record<ThumbnailStage, string | undefined> = {
    loading: t.app.thumbLoading,
    frames: t.app.thumbFrames,
    faces: t.app.thumbFaces,
    cutout: t.app.thumbCutout,
    drawing: t.app.thumbDrawing,
  };

  const run = async () => {
    setError(null);
    try {
      const result = await generateThumbnails(file, durationSeconds, ideas, setStage);
      setThumbnails(result.thumbnails);
      setFaceFound(result.faceFound);
      setSelected(0);
      if (result.thumbnails[0]) onPreview(result.thumbnails[0].url);
    } catch (err) {
      setError(fmt(t.app.thumbError, { error: err instanceof Error ? err.message : String(err) }));
    } finally {
      setStage(null);
    }
  };

  const choose = (i: number) => {
    setSelected(i);
    const th = thumbnails[i];
    if (th) onPreview(th.url);
  };

  return (
    <section className="space-y-4 rounded-xl bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{t.app.thumbTitle}</h3>
          <p className="text-sm text-muted-foreground">{t.app.thumbBody}</p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={stage !== null}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-progress disabled:opacity-60"
        >
          {stage ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          {stage ? stageLabel[stage] : thumbnails.length ? t.app.thumbRegenerate : t.app.thumbGenerate}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-negative-soft p-3 text-sm text-negative">
          {error}
        </p>
      )}
      {thumbnails.length > 0 && !faceFound && (
        <p className="rounded-lg bg-sage-softer p-3 text-sm text-sage">{t.app.thumbNoFace}</p>
      )}

      {thumbnails.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {thumbnails.map((th, i) => (
            <figure
              key={th.url}
              className={cn(
                "space-y-2 rounded-xl p-2 transition-colors",
                i === selected ? "bg-sage-softer ring-2 ring-sage" : "bg-muted"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- generated locally as an object URL */}
              <img src={th.url} alt={`${t.app.thumbTitle} ${i + 1}`} className="aspect-video w-full rounded-lg object-cover" />
              <figcaption className="flex gap-2">
                <button
                  type="button"
                  onClick={() => choose(i)}
                  aria-pressed={i === selected}
                  className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-card text-xs font-semibold shadow-card"
                >
                  <Eye className="size-3.5" />
                  {t.app.thumbUseInFeed}
                </button>
                <a
                  href={th.url}
                  download={`thumbnail-${th.template}-1280x720.png`}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                >
                  <Download className="size-3.5" />
                  {t.app.thumbDownload}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
