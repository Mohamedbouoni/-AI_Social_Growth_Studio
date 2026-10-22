// =============================================================================
// Browser-side frame capture for previews and the AI (zero server cost)
// =============================================================================

export interface CapturedFrames {
  /** Object URLs of 1280px JPEGs for the feed simulator (revoke when done) */
  previews: string[];
  /** Small 512px JPEGs sent to vision-capable models */
  aiFrames: Blob[];
}

const POSITIONS = [0.1, 0.5, 0.85];

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Seek failed"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });
}

function toJpeg(video: HTMLVideoElement, maxWidth: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Grabs 3 frames (start, middle, near the end). Returns empty lists when the
 * browser cannot play the codec (e.g. some HEVC .mov files): frames are a
 * bonus, the analysis works from the audio alone.
 */
export async function captureFrames(file: File): Promise<CapturedFrames> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadeddata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("Cannot decode video")), { once: true });
      setTimeout(() => reject(new Error("Timed out loading video")), 15000);
    });
    if (!video.videoWidth || !Number.isFinite(video.duration)) return { previews: [], aiFrames: [] };

    const previews: string[] = [];
    const aiFrames: Blob[] = [];
    for (const position of POSITIONS) {
      await seek(video, video.duration * position);
      const [preview, small] = await Promise.all([toJpeg(video, 1280, 0.85), toJpeg(video, 512, 0.7)]);
      if (preview) previews.push(URL.createObjectURL(preview));
      if (small) aiFrames.push(small);
    }
    return { previews, aiFrames };
  } catch {
    return { previews: [], aiFrames: [] };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
