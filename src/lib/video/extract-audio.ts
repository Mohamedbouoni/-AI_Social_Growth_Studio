// =============================================================================
// Browser-side audio extraction (no video bytes are uploaded)
// =============================================================================
// Decodes the dropped video with WebCodecs (via Mediabunny), drops the video
// track and re-encodes speech-quality audio: mono 16 kHz Opus at 24 kbps
// (~1.8 MB per 10 min). Browsers that cannot encode Opus get 16 kHz mono WAV
// split into 10-minute chunks, each under Whisper's 25 MB limit.
// =============================================================================

import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  OggOutputFormat,
  Output,
  WavOutputFormat,
  canEncodeAudio,
} from "mediabunny";

export interface AudioPart {
  blob: Blob;
  /** Where this part starts in the video, in seconds */
  offsetSeconds: number;
}

export interface ExtractedAudio {
  parts: AudioPart[];
  durationSeconds: number;
  format: "opus" | "wav";
}

export class VideoReadError extends Error {
  readonly reason: "no-audio" | "unsupported";
  constructor(reason: "no-audio" | "unsupported", message: string) {
    super(message);
    this.name = "VideoReadError";
    this.reason = reason;
  }
}

const SAMPLE_RATE = 16000;
const OPUS_BITRATE = 24000;
const WAV_CHUNK_SECONDS = 600; // 16 kHz s16 mono = 32 KB/s -> ~19 MB per chunk

function openInput(file: File) {
  return new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
}

/** Reads the duration without decoding anything (fast, for the plan-limit check). */
export async function probeVideo(file: File): Promise<{ durationSeconds: number; hasAudio: boolean }> {
  try {
    const input = openInput(file);
    const [durationSeconds, audio] = await Promise.all([input.computeDuration(), input.getPrimaryAudioTrack()]);
    return { durationSeconds, hasAudio: audio !== null };
  } catch {
    throw new VideoReadError("unsupported", "This browser cannot read this video file.");
  }
}

async function convertSegment(
  file: File,
  format: "opus" | "wav",
  trim: { start: number; end: number } | undefined,
  onProgress: (fraction: number) => void
): Promise<Blob> {
  const output = new Output({
    format: format === "opus" ? new OggOutputFormat() : new WavOutputFormat(),
    target: new BufferTarget(),
  });

  const conversion = await Conversion.init({
    input: openInput(file),
    output,
    video: { discard: true },
    audio: {
      codec: format === "opus" ? "opus" : "pcm-s16",
      numberOfChannels: 1,
      sampleRate: SAMPLE_RATE,
      ...(format === "opus" ? { bitrate: OPUS_BITRATE } : {}),
      forceTranscode: true,
    },
    ...(trim ? { trim } : {}),
    showWarnings: false,
  });

  if (!conversion.isValid) {
    const reasons = conversion.discardedTracks.map((t) => t.reason).join(", ");
    throw new VideoReadError("unsupported", `Cannot convert this video's audio (${reasons || "unknown"}).`);
  }

  conversion.onProgress = (progress) => onProgress(progress);
  await conversion.execute();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new VideoReadError("unsupported", "Audio extraction produced no data.");
  return new Blob([buffer], { type: format === "opus" ? "audio/ogg" : "audio/wav" });
}

export async function extractAudio(
  file: File,
  onProgress: (fraction: number) => void = () => {}
): Promise<ExtractedAudio> {
  const { durationSeconds, hasAudio } = await probeVideo(file);
  if (!hasAudio) throw new VideoReadError("no-audio", "This video has no audio track.");

  const opus = await canEncodeAudio("opus", {
    numberOfChannels: 1,
    sampleRate: SAMPLE_RATE,
    bitrate: OPUS_BITRATE,
  }).catch(() => false);

  if (opus) {
    const blob = await convertSegment(file, "opus", undefined, onProgress);
    return { parts: [{ blob, offsetSeconds: 0 }], durationSeconds, format: "opus" };
  }

  // WAV fallback, chunked so every part stays under the upload limit
  const parts: AudioPart[] = [];
  const count = Math.max(1, Math.ceil(durationSeconds / WAV_CHUNK_SECONDS));
  for (let i = 0; i < count; i++) {
    const start = i * WAV_CHUNK_SECONDS;
    const end = Math.min(durationSeconds, start + WAV_CHUNK_SECONDS);
    const blob = await convertSegment(file, "wav", count > 1 ? { start, end } : undefined, (p) =>
      onProgress((i + p) / count)
    );
    parts.push({ blob, offsetSeconds: start });
  }
  return { parts, durationSeconds, format: "wav" };
}
