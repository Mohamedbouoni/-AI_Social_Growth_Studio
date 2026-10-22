"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Clapperboard, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { ApiError, isUpgradeError } from "@/lib/queries/client";
import { useRefreshAfterSpend, useSessionProfile, useUsage } from "@/lib/queries/hooks";
import { extractAudio, probeVideo, VideoReadError } from "@/lib/video/extract-audio";
import { captureFrames } from "@/lib/video/frames";
import { useUpgrade } from "@/components/billing/upgrade-provider";
import { FeedSimulator } from "@/components/video/feed-simulator";
import { ThumbnailStudio } from "@/components/video/thumbnail-studio";
import { VideoResults } from "@/components/video/video-results";
import { CREDIT_COST, PLANS } from "@/types";
import type { TranscriptSegment, VideoPackage } from "@/modules/ai/video-schemas";

type Step = 0 | 1 | 2 | 3 | 4; // extract, upload, transcribe, analyze, ready

interface AnalysisResult {
  data: VideoPackage;
  segments: TranscriptSegment[];
  durationSeconds: number;
  projectId: string | null;
}

// Server work has no progress events; switch the label once transcription
// has had a fair chance to finish (Whisper handles minutes of audio in seconds)
const TRANSCRIBE_LABEL_MS = 6000;

/** XHR instead of fetch: it reports upload progress for the progress bar. */
function postAnalysis(form: FormData, onUploadProgress: (fraction: number) => void): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/video/analyze");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onUploadProgress(e.loaded / e.total);
    xhr.upload.onload = () => onUploadProgress(1);
    xhr.onerror = () => reject(new ApiError("Network error while uploading.", 0));
    xhr.onload = () => {
      const json = xhr.response as ({ success?: boolean; error?: string; code?: string } & AnalysisResult) | null;
      if (xhr.status >= 200 && xhr.status < 300 && json?.success) resolve(json);
      else reject(new ApiError(json?.error ?? "Analysis failed.", xhr.status, json?.code));
    };
    xhr.send(form);
  });
}

export default function VideoStudioPage() {
  const { t } = useLanguage();
  const { openUpgrade } = useUpgrade();
  const { data: usage } = useUsage();
  const { data: profile } = useSessionProfile();
  const refreshAfterSpend = useRefreshAfterSpend();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [feedCover, setFeedCover] = useState<string | null>(null);

  const maxSeconds = PLANS[usage?.plan ?? "free"].maxVideoSeconds;
  const busy = step !== null && step < 4;

  // Frame previews are object URLs; free them when replaced or on leave
  useEffect(() => () => frames.forEach((url) => URL.revokeObjectURL(url)), [frames]);

  const reset = () => {
    setResult(null);
    setStep(null);
    setError(null);
    setFrames([]);
    setVideoFile(null);
    setFeedCover(null);
  };

  const handleFile = async (file: File) => {
    if (busy) return;
    reset();

    try {
      // 1. Cheap checks before any work: duration vs plan, credits left
      const { durationSeconds, hasAudio } = await probeVideo(file);
      if (!hasAudio) throw new VideoReadError("no-audio", "");
      if (durationSeconds > maxSeconds + 5) {
        const message = fmt(t.app.videoTooLong, {
          minutes: Math.ceil(durationSeconds / 60),
          limit: Math.round(maxSeconds / 60),
        });
        if (usage?.plan === "free") openUpgrade(message);
        else setError(message);
        return;
      }
      if (usage && usage.credits.remaining < CREDIT_COST.video) {
        openUpgrade();
        return;
      }

      // 2. Extract audio + grab frames in the browser
      setStep(0);
      setProgress(0);
      const [audio, captured] = await Promise.all([
        extractAudio(file, setProgress),
        captureFrames(file, durationSeconds),
      ]);
      setFrames(captured.previews);

      // 3. Upload only the small audio + frames
      const form = new FormData();
      audio.parts.forEach((part, i) =>
        form.append("audio", part.blob, `audio-${i}.${audio.format === "opus" ? "ogg" : "wav"}`)
      );
      form.append("offsets", JSON.stringify(audio.parts.map((p) => p.offsetSeconds)));
      form.append("durationSeconds", String(audio.durationSeconds));
      form.append("requestId", crypto.randomUUID());
      captured.aiFrames.forEach((blob, i) => form.append("frames", blob, `frame-${i}.jpg`));

      setStep(1);
      setProgress(0);
      let analyzeTimer: ReturnType<typeof setTimeout> | undefined;
      const response = await postAnalysis(form, (fraction) => {
        setProgress(fraction);
        if (fraction >= 1) {
          setStep(2);
          analyzeTimer ??= setTimeout(() => setStep((s) => (s === 2 ? 3 : s)), TRANSCRIBE_LABEL_MS);
        }
      }).finally(() => clearTimeout(analyzeTimer));

      setVideoFile(file);
      setResult(response);
      setStep(4);
      refreshAfterSpend();
    } catch (err) {
      setStep(null);
      if (err instanceof VideoReadError) {
        setError(err.reason === "no-audio" ? t.app.videoNoAudio ?? "" : t.app.videoUnsupported ?? "");
      } else if (isUpgradeError(err)) {
        openUpgrade(err.message);
      } else {
        setError(err instanceof Error && err.message ? err.message : t.app.videoAnalysisFailed ?? "");
      }
    }
  };

  const steps = [t.app.stepExtract, t.app.stepUpload, t.app.stepTranscribe, t.app.stepAnalyze, t.app.stepReady];

  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <RotateCcw className="size-4" />
            {t.app.videoNew}
          </button>
          {result.projectId && (
            <Link
              href="/dashboard/library"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-positive-soft px-4 text-sm font-semibold text-positive"
            >
              <Check className="size-4" />
              {t.app.savedToLibrary}
            </Link>
          )}
        </div>
        <VideoResults pkg={result.data} segments={result.segments} durationSeconds={result.durationSeconds} />
        {videoFile && (
          <ThumbnailStudio
            file={videoFile}
            durationSeconds={result.durationSeconds}
            ideas={result.data.youtube.thumbnails}
            onPreview={setFeedCover}
          />
        )}
        <FeedSimulator
          pkg={result.data}
          frames={frames}
          durationSeconds={result.durationSeconds}
          channelName={profile?.name ?? "Your channel"}
          coverOverride={feedCover}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "flex min-h-72 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-card p-8 text-center shadow-card transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          dragging ? "border-sage bg-sage-softer" : "border-border",
          busy && "cursor-progress"
        )}
      >
        <span className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
          {busy ? <Loader2 className="size-7 animate-spin" /> : <UploadCloud className="size-7" />}
        </span>
        <div className="space-y-1">
          <p className="text-lg font-bold">{t.app.videoDropTitle}</p>
          <p className="text-sm text-muted-foreground">{t.app.videoDropBody}</p>
        </div>
        {!busy && (
          <span className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            {t.app.videoChoose}
          </span>
        )}
        <p className="text-xs text-muted-foreground">{fmt(t.app.videoCost, { minutes: Math.round(maxSeconds / 60) })}</p>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleFile(file);
          }}
        />
      </div>

      {step !== null && (
        <ol className="grid grid-cols-5 gap-2" aria-live="polite">
          {steps.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={label} className="space-y-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full bg-sage transition-[width] duration-300", (current && (i === 2 || i === 3)) && "animate-pulse")}
                    style={{ width: done ? "100%" : current ? `${i <= 1 ? Math.round(progress * 100) : 60}%` : "0%" }}
                  />
                </div>
                <p className={cn("flex items-center gap-1 text-xs", current ? "font-semibold" : "text-muted-foreground")}>
                  {done && <Check className="size-3 text-positive" />}
                  {current && i < 4 && <Loader2 className="size-3 animate-spin" />}
                  {label}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-negative-soft p-4 text-sm text-negative">
          <Clapperboard className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
