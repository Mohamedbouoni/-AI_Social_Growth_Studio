import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, handleApiError, unauthenticated } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { analyzeVideoService } from "@/modules/ai/video-analysis-service";

// Transcription + analysis of a 30-minute video can take a while
export const maxDuration = 300;

// Groq Whisper's per-file limit; the browser sends 16 kHz mono Opus (or WAV chunks)
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_AUDIO_CHUNKS = 4;
const MAX_FRAME_BYTES = 400 * 1024;
const MAX_FRAMES = 3;

const fieldsSchema = z.object({
  durationSeconds: z.coerce.number().positive().max(4 * 3600),
  offsets: z.string().transform((v, ctx) => {
    try {
      return z.array(z.number().min(0)).parse(JSON.parse(v));
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid offsets" });
      return z.NEVER;
    }
  }),
  requestId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthenticated();

    const form = await request.formData().catch(() => {
      throw new AppError("INVALID_REQUEST", "Expected a multipart form upload.", 400);
    });

    const fields = fieldsSchema.parse({
      durationSeconds: form.get("durationSeconds"),
      offsets: form.get("offsets") ?? "[0]",
      requestId: form.get("requestId") || undefined,
    });

    const audioFiles = form.getAll("audio").filter((v): v is File => v instanceof File);
    if (audioFiles.length === 0 || audioFiles.length > MAX_AUDIO_CHUNKS) {
      throw new AppError("INVALID_REQUEST", "Upload between 1 and 4 audio parts.", 400);
    }
    if (audioFiles.some((f) => f.size === 0 || f.size > MAX_AUDIO_BYTES)) {
      throw new AppError("INVALID_REQUEST", "Each audio part must be under 25 MB.", 400);
    }
    if (fields.offsets.length !== audioFiles.length) {
      throw new AppError("INVALID_REQUEST", "Audio parts and offsets do not match.", 400);
    }

    const frameFiles = form
      .getAll("frames")
      .filter((v): v is File => v instanceof File && v.type === "image/jpeg" && v.size <= MAX_FRAME_BYTES)
      .slice(0, MAX_FRAMES);
    const frames = await Promise.all(
      frameFiles.map(async (f) => `data:image/jpeg;base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`)
    );

    const result = await analyzeVideoService(user.id, {
      audio: audioFiles.map((file, i) => ({ file, offsetSeconds: fields.offsets[i] ?? 0 })),
      frames,
      durationSeconds: fields.durationSeconds,
      requestId: fields.requestId,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      segments: result.transcript.segments,
      transcript: result.transcript.text,
      language: result.transcript.language,
      durationSeconds: result.transcript.durationSeconds,
      projectId: result.projectId,
      creditsRemaining: result.creditsRemaining,
    });
  } catch (err: unknown) {
    return handleApiError(err, "/api/video/analyze");
  }
}
