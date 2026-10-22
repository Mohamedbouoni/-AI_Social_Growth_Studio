// =============================================================================
// Video Analysis Service — audio + frames in, omnichannel package out
// =============================================================================
// Flow: check plan length -> reserve 5 credits -> transcribe -> re-check the
// real duration -> one structured AI call -> save to library. Credits are
// released on any failure, as in the other generation services.
// =============================================================================

import { createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logging/logger";
import { getEntitlement } from "@/modules/billing/entitlement";
import { recordUsageDetails, releaseCredits, reserveCredits } from "@/modules/billing/credits";
import { saveVideoToLibrary } from "@/modules/library/library-service";
import { getAIProvider } from "./provider-factory";
import { buildVideoMessages, sampleVideoPackage } from "./prompts/video";
import { formatTranscript, transcribe, type AudioChunk } from "./transcribe";
import { formatTime } from "@/lib/video/format";
import { CREDIT_COST } from "@/types";
import { videoPackageSchema, type Transcript, type VideoPackage } from "./video-schemas";

// Tolerance between the browser's duration and Whisper's (encoder padding)
const DURATION_TOLERANCE_SECONDS = 5;
const MIN_TRANSCRIPT_CHARS = 20;

export interface AnalyzeVideoInput {
  audio: AudioChunk[];
  /** Small JPEG frames as data URLs, sent to vision-capable models */
  frames: string[];
  durationSeconds: number;
  requestId?: string;
}

export interface AnalyzeVideoResult {
  data: VideoPackage;
  transcript: Transcript;
  projectId: string | null;
  /** True when the built-in sample was used (no AI key configured) */
  isSample: boolean;
  creditsRemaining: number;
}

function tooLong(limit: number): AppError {
  const minutes = Math.round(limit / 60);
  return new AppError(
    "PLAN_FEATURE",
    `Videos on your plan can be up to ${minutes} minutes. Upgrade to analyze videos up to 30 minutes.`,
    403
  );
}

export async function analyzeVideoService(
  userId: string,
  input: AnalyzeVideoInput
): Promise<AnalyzeVideoResult> {
  const requestId = input.requestId || crypto.randomUUID();
  const supabase = createAdminClient();
  const entitlement = await getEntitlement(supabase, userId);
  const limit = entitlement.config.maxVideoSeconds;

  // Cheap check first, before spending credits or transcription quota
  if (input.durationSeconds > limit + DURATION_TOLERANCE_SECONDS) throw tooLong(limit);

  const used = await reserveCredits(supabase, entitlement, {
    requestId,
    kind: "video",
    model: "video-analysis",
  });

  try {
    const transcript = await transcribe(input.audio, input.durationSeconds);

    // The browser's duration can be faked; Whisper's measurement cannot
    if (transcript.durationSeconds > limit + DURATION_TOLERANCE_SECONDS) throw tooLong(limit);
    // No speech (music, crowd noise): fall back to the frames, which only
    // vision models (Gemini, OpenAI) can see; Groq Llama would invent content
    const visualOnly = transcript.text.trim().length < MIN_TRANSCRIPT_CHARS;
    const visionAvailable = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
    if (visualOnly && (input.frames.length === 0 || !visionAvailable)) {
      throw new AppError(
        "INVALID_REQUEST",
        input.frames.length === 0
          ? "We couldn't find speech in this video, and couldn't read its images either. Try exporting it as MP4."
          : "This video has no speech. Add a free GEMINI_API_KEY so Video Studio can analyze it from its images.",
        400
      );
    }
    const totalSeconds = transcript.durationSeconds || input.durationSeconds;
    const frameTimes = [0.1, 0.5, 0.85].map((p) => formatTime(p * totalSeconds));

    const provider = getAIProvider({
      tier: entitlement.config.features.qualityModel ? "quality" : "fast",
      language: transcript.language === "ar" ? "ar" : "auto",
      needsImages: input.frames.length > 0,
    });

    const result = await provider.generateStructured(
      buildVideoMessages(formatTranscript(transcript), input.frames, frameTimes, visualOnly),
      videoPackageSchema,
      { mock: sampleVideoPackage }
    );

    await recordUsageDetails(supabase, entitlement.workspaceId, requestId, result.providerName, result.usage);

    const pkg = result.data;
    // Built-in dev sample (no AI key): clearly flagged and never charged
    const isSample = transcript.sample === true || result.providerName === "mock-dev";
    const projectId = await saveVideoToLibrary(supabase, entitlement.workspaceId, {
      title: pkg.youtube.titles[0]?.text ?? pkg.core.takeaway,
      niche: pkg.detected.niche,
      language: transcript.language ?? pkg.detected.language,
      tone: pkg.detected.tone,
      transcript: transcript.text,
      durationSeconds: transcript.durationSeconds || input.durationSeconds,
      output: { kind: "video_package", ...pkg, segments: transcript.segments, isSample },
    });

    if (isSample) await releaseCredits(supabase, entitlement.workspaceId, requestId);

    return {
      data: pkg,
      transcript,
      projectId,
      isSample,
      creditsRemaining: Math.max(0, entitlement.config.credits - (isSample ? used - CREDIT_COST.video : used)),
    };
  } catch (err) {
    await releaseCredits(supabase, entitlement.workspaceId, requestId);
    logger.warn("Video analysis failed, credits released", {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
