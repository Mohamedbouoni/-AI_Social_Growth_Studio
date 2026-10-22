// =============================================================================
// Speech-to-text for the Video Studio
// =============================================================================
// Order: Groq Whisper (whisper-large-v3-turbo, timestamped segments, free
// tier ~8 h of audio/day) -> Gemini audio understanding -> dev-only sample.
// Audio arrives already compressed by the browser (16 kHz mono Opus, or WAV
// chunks with their start offsets), so no video bytes ever reach the server.
// =============================================================================

import { z } from "zod";
import { logger } from "@/lib/logging/logger";
import { AIConfigurationError } from "./provider-factory";
import { extractJson } from "./validate";
import type { Transcript, TranscriptSegment } from "./video-schemas";
import { formatTime } from "@/lib/video/format";

export interface AudioChunk {
  file: Blob;
  /** Where this chunk starts in the video, in seconds */
  offsetSeconds: number;
}

// Whisper reports languages by English name
const LANGUAGE_CODES: Record<string, string> = {
  english: "en", arabic: "ar", french: "fr", spanish: "es", german: "de", italian: "it",
  portuguese: "pt", turkish: "tr", dutch: "nl", russian: "ru", hindi: "hi", urdu: "ur",
  indonesian: "id", japanese: "ja", korean: "ko", chinese: "zh", persian: "fa",
};

export function toLanguageCode(value: string | undefined | null): string | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(lower)) return lower;
  return LANGUAGE_CODES[lower] ?? null;
}

const whisperSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  duration: z.number().optional(),
  segments: z
    .array(z.object({ start: z.number(), end: z.number(), text: z.string() }))
    .optional()
    .default([]),
});

async function transcribeWithGroq(chunks: AudioChunk[], apiKey: string): Promise<Transcript> {
  const segments: TranscriptSegment[] = [];
  const texts: string[] = [];
  let language: string | null = null;
  let durationSeconds = 0;

  for (const [index, chunk] of chunks.entries()) {
    const form = new FormData();
    const extension = chunk.file.type.includes("wav") ? "wav" : "ogg";
    form.append("file", chunk.file, `audio-${index}.${extension}`);
    form.append("model", process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Groq transcription error (${response.status}): ${body.slice(0, 300)}`);
    }

    const result = whisperSchema.parse(await response.json());
    texts.push(result.text.trim());
    language ??= toLanguageCode(result.language);
    durationSeconds = Math.max(durationSeconds, chunk.offsetSeconds + (result.duration ?? 0));
    for (const s of result.segments) {
      segments.push({
        start: s.start + chunk.offsetSeconds,
        end: s.end + chunk.offsetSeconds,
        text: s.text.trim(),
      });
    }
  }

  return { text: texts.join(" "), segments, language, durationSeconds };
}

const geminiTranscriptSchema = z.object({
  language: z.string().optional(),
  durationSeconds: z.coerce.number().optional(),
  segments: z.array(z.object({ start: z.coerce.number(), end: z.coerce.number(), text: z.string() })),
});

async function transcribeWithGemini(chunks: AudioChunk[], apiKey: string): Promise<Transcript> {
  const model = process.env.GEMINI_MODEL_QUALITY || "gemini-flash-latest";
  const segments: TranscriptSegment[] = [];
  let language: string | null = null;
  let durationSeconds = 0;

  for (const chunk of chunks) {
    const data = Buffer.from(await chunk.file.arrayBuffer()).toString("base64");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: chunk.file.type || "audio/ogg", data } },
                {
                  text:
                    'Transcribe this audio verbatim in its original language. Return JSON only: {"language":"<ISO 639-1>","durationSeconds":<number>,"segments":[{"start":<seconds>,"end":<seconds>,"text":"..."}]} with one segment per sentence.',
                },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
        signal: AbortSignal.timeout(120000),
      }
    );
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Gemini transcription error (${response.status}): ${body.slice(0, 300)}`);
    }

    const json = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const result = geminiTranscriptSchema.parse(extractJson(raw));
    language ??= toLanguageCode(result.language);
    for (const s of result.segments) {
      segments.push({ start: s.start + chunk.offsetSeconds, end: s.end + chunk.offsetSeconds, text: s.text.trim() });
    }
    const lastEnd = result.segments.at(-1)?.end ?? 0;
    durationSeconds = Math.max(durationSeconds, chunk.offsetSeconds + (result.durationSeconds ?? lastEnd));
  }

  return { text: segments.map((s) => s.text).join(" "), segments, language, durationSeconds };
}

/** Dev-only sample so the whole flow can be tried without any API key. */
function sampleTranscript(durationSeconds: number): Transcript {
  const lines = [
    "Most creators waste their first ten seconds, and that is exactly why their videos die.",
    "Today I will show you the three-step framework I use to plan every video in under an hour.",
    "Step one: write the hook before anything else, and make it a promise the viewer cares about.",
    "Step two: cut every sentence that does not move the story forward.",
    "Step three: end with one clear action, not five.",
    "If you apply this to your next video, comment which step was hardest for you.",
  ];
  const step = Math.max(5, durationSeconds / lines.length);
  const segments = lines.map((text, i) => ({ start: i * step, end: (i + 1) * step, text }));
  return { text: lines.join(" "), segments, language: "en", durationSeconds, sample: true };
}

export async function transcribe(chunks: AudioChunk[], claimedDurationSeconds: number): Promise<Transcript> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (groqKey) {
    try {
      return await transcribeWithGroq(chunks, groqKey);
    } catch (err) {
      if (!geminiKey) throw err;
      logger.warn("Groq transcription failed, trying Gemini", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  if (geminiKey) return transcribeWithGemini(chunks, geminiKey);

  if (process.env.NODE_ENV === "development") return sampleTranscript(claimedDurationSeconds);
  throw new AIConfigurationError();
}

/** "[mm:ss] text" lines for the analysis prompt, capped to keep the request small. */
export function formatTranscript(transcript: Transcript, maxChars = 60000): string {
  const lines = transcript.segments.length
    ? transcript.segments.map((s) => `[${formatTime(s.start)}] ${s.text}`)
    : [transcript.text];
  const joined = lines.join("\n");
  return joined.length > maxChars ? `${joined.slice(0, maxChars)}\n[… transcript truncated]` : joined;
}
