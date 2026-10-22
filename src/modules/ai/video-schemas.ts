// =============================================================================
// Video Studio — omnichannel package schema
// =============================================================================
// One AI call returns everything below. Lists are lenient (extra items are
// trimmed, comma/newline strings are split) because free models overshoot.
// =============================================================================

import { z } from "zod";

function list<T extends z.ZodType>(item: T, max: number) {
  return z.preprocess((value) => {
    if (typeof value === "string") value = value.split(/\n+|,\s*/).map((s) => s.trim()).filter(Boolean);
    return Array.isArray(value) ? value.slice(0, max) : value;
  }, z.array(item));
}

const text = z.string().trim().min(1);
const timestamp = z.string().trim().regex(/^\d{1,2}:\d{2}(:\d{2})?$/, "Use mm:ss");

export const videoPackageSchema = z.object({
  detected: z.object({
    /** ISO 639-1 code of the spoken language, e.g. "en", "ar", "fr" */
    language: z.string().trim().toLowerCase().min(2).max(12),
    languageName: text,
    /** e.g. "Tunisian Arabic"; empty when not a dialect */
    dialect: z.string().trim().optional().default(""),
    niche: text,
    subNiche: z.string().trim().optional().default(""),
    tone: text,
    energy: z.enum(["low", "medium", "high"]).catch("medium"),
  }),
  core: z.object({
    takeaway: text,
    problem: text,
    audience: text,
  }),
  chapters: list(z.object({ time: timestamp, title: text }), 12),
  youtube: z.object({
    titles: list(z.object({ style: text, text: text }), 5),
    description: text,
    tags: list(text, 30),
    hashtags: list(text, 8),
    thumbnails: list(z.object({ headline: text, expression: text, layout: text }), 3),
  }),
  short: z.object({
    hooks: list(z.object({ style: text, text: text }), 3),
    caption: text,
    hashtags: z.object({
      viral: list(text, 10),
      niche: list(text, 10),
      micro: list(text, 10),
    }),
    overlays: list(text, 3),
  }),
  social: z.object({
    xThread: list(text, 10),
    linkedinPost: text,
  }),
  cueSheet: list(z.object({ time: timestamp, action: text, note: text }), 20),
  hook: z.object({
    score: z.coerce.number().transform((n) => Math.round(Math.min(100, Math.max(0, n)))),
    reasons: list(text, 5),
    improvedHook: text,
  }),
});

export type VideoPackage = z.infer<typeof videoPackageSchema>;

export interface TranscriptSegment {
  /** Seconds from the start of the video */
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  text: string;
  segments: TranscriptSegment[];
  /** ISO 639-1 code when the transcriber reports one */
  language: string | null;
  durationSeconds: number;
  /** True when this is the built-in dev sample, not the real audio */
  sample?: boolean;
}
