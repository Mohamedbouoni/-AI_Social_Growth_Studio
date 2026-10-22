// =============================================================================
// Face thumbnail generator (runs entirely in the browser, zero server cost)
// =============================================================================
// 1. Sample ~12 frames from the video.
// 2. MediaPipe FaceDetector scores each frame: confident, large, sharp faces win.
// 3. MediaPipe selfie segmenter cuts the creator out of the best frame.
// 4. Three canvas templates combine the cut-out with the AI's headline ideas,
//    exported as 1280x720 PNGs.
// MediaPipe (Apache-2.0) loads its WASM runtime and the two small models from
// Google's CDNs on first use, so nothing extra ships in the app bundle.
// =============================================================================

import type { FaceDetector, ImageSegmenter } from "@mediapipe/tasks-vision";

const TASKS_VERSION = "1.1.0";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const SEGMENT_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

export const THUMB_WIDTH = 1280;
export const THUMB_HEIGHT = 720;
const SAMPLE_COUNT = 12;

export interface ThumbnailIdea {
  headline: string;
}

export interface GeneratedThumbnail {
  template: "bold" | "split" | "spotlight";
  blob: Blob;
  url: string;
}

export type ThumbnailStage = "loading" | "frames" | "faces" | "cutout" | "drawing";

// ---------------------------------------------------------------------------
// MediaPipe (created once per page)
// ---------------------------------------------------------------------------

let models: Promise<{ detector: FaceDetector; segmenter: ImageSegmenter }> | null = null;

function loadModels() {
  models ??= (async () => {
    const { FilesetResolver, FaceDetector, ImageSegmenter } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    const [detector, segmenter] = await Promise.all([
      FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.5,
      }),
      ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: SEGMENT_MODEL },
        runningMode: "IMAGE",
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      }),
    ]);
    return { detector, segmenter };
  })().catch((err) => {
    models = null; // allow a retry after a network failure
    throw err;
  });
  return models;
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

async function sampleFrames(file: File, durationSeconds: number): Promise<HTMLCanvasElement[]> {
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
    });
    const duration = Number.isFinite(video.duration) ? video.duration : durationSeconds;
    const frames: HTMLCanvasElement[] = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      // Skip the very start and end, where creators blink or look away
      const time = duration * (0.05 + (0.9 * i) / (SAMPLE_COUNT - 1));
      await new Promise<void>((resolve) => {
        video.addEventListener("seeked", () => resolve(), { once: true });
        video.currentTime = time;
      });
      const scale = Math.min(1, THUMB_WIDTH / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas);
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

/** Variance of the Laplacian on a small grayscale crop: higher = sharper. */
function sharpness(source: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number }): number {
  const size = 96;
  const crop = document.createElement("canvas");
  crop.width = size;
  crop.height = size;
  const ctx = crop.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const gray = new Float32Array(size * size);
  for (let i = 0; i < gray.length; i++) gray[i] = data[i * 4]! * 0.299 + data[i * 4 + 1]! * 0.587 + data[i * 4 + 2]! * 0.114;
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      const lap = 4 * gray[i]! - gray[i - 1]! - gray[i + 1]! - gray[i - size]! - gray[i + size]!;
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

interface FrameScore {
  frame: HTMLCanvasElement;
  score: number;
  face: { x: number; y: number; w: number; h: number } | null;
}

function scoreFrames(detector: FaceDetector, frames: HTMLCanvasElement[]): FrameScore {
  const scored = frames.map((frame): FrameScore => {
    const detection = detector
      .detect(frame)
      .detections.filter((d) => d.boundingBox)
      .sort((a, b) => b.boundingBox!.width * b.boundingBox!.height - a.boundingBox!.width * a.boundingBox!.height)[0];
    if (!detection?.boundingBox) return { frame, score: 0, face: null };
    const b = detection.boundingBox;
    const face = { x: b.originX, y: b.originY, w: b.width, h: b.height };
    const confidence = detection.categories[0]?.score ?? 0.5;
    const area = (face.w * face.h) / (frame.width * frame.height);
    // Bigger faces read better at thumbnail size, up to about a quarter of the frame
    const sizeScore = Math.min(1, area / 0.25);
    const sharp = Math.min(1, sharpness(frame, face) / 400);
    return { frame, face, score: confidence * (0.4 + 0.6 * sizeScore) * (0.3 + 0.7 * sharp) };
  });
  const best = scored.sort((a, b) => b.score - a.score)[0]!;
  // No face anywhere: fall back to the middle frame without a cut-out
  return best.face ? best : { frame: frames[Math.floor(frames.length / 2)]!, score: 0, face: null };
}

/**
 * Transparent canvas containing only the person. The segmenter's low-res mask
 * is thresholded, clipped to the area a body can occupy around the detected
 * face (removes stray background blobs), then scaled up with bilinear
 * filtering and a slight blur for soft, non-jagged edges.
 */
function cutOut(
  segmenter: ImageSegmenter,
  frame: HTMLCanvasElement,
  face: { x: number; y: number; w: number; h: number }
): HTMLCanvasElement {
  const result = segmenter.segment(frame);
  const mask = result.confidenceMasks?.[0];
  const out = document.createElement("canvas");
  out.width = frame.width;
  out.height = frame.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(frame, 0, 0);

  if (mask) {
    const values = mask.getAsFloat32Array();
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = mask.width;
    maskCanvas.height = mask.height;
    const mctx = maskCanvas.getContext("2d")!;
    const image = mctx.createImageData(mask.width, mask.height);

    // Body region in mask coordinates: up to 3 face-widths either side of the
    // face center, from just above the head down to the bottom of the frame
    const sx = mask.width / frame.width;
    const sy = mask.height / frame.height;
    const centerX = (face.x + face.w / 2) * sx;
    const halfWidth = face.w * 3 * sx;
    const top = (face.y - face.h * 0.7) * sy;

    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const i = y * mask.width + x;
        const inBody = y >= top && Math.abs(x - centerX) <= halfWidth;
        // Smoothstep between 0.45 and 0.8 confidence: drops unsure background
        const t = inBody ? Math.min(1, Math.max(0, ((values[i] ?? 0) - 0.45) / 0.35)) : 0;
        image.data[i * 4 + 3] = Math.round(t * t * (3 - 2 * t) * 255);
      }
    }
    mctx.putImageData(image, 0, 0);

    ctx.globalCompositeOperation = "destination-in";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.filter = "blur(1.5px)";
    ctx.drawImage(maskCanvas, 0, 0, out.width, out.height);
    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over";
  }
  result.close();
  return out;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function fontFamily(): string {
  return getComputedStyle(document.body).fontFamily || "sans-serif";
}

/** Wraps and auto-sizes a headline into a box; returns the lines and font size. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxSize: number
): { lines: string[]; size: number } {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  for (let size = maxSize; size >= 40; size -= 4) {
    ctx.font = `900 ${size}px ${fontFamily()}`;
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    if (lines.length * size * 1.05 <= maxHeight && lines.every((l) => ctx.measureText(l).width <= maxWidth)) {
      return { lines, size };
    }
  }
  return { lines: [text.toUpperCase()], size: 40 };
}

function drawHeadline(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: { x: number; y: number; w: number; h: number },
  style: { fill: string; stroke?: string; maxSize: number; rtl: boolean }
) {
  const { lines, size } = fitText(ctx, text, box.w, box.h, style.maxSize);
  ctx.save();
  ctx.direction = style.rtl ? "rtl" : "ltr";
  ctx.textAlign = style.rtl ? "right" : "left";
  ctx.textBaseline = "top";
  ctx.font = `900 ${size}px ${fontFamily()}`;
  ctx.lineJoin = "round";
  const x = style.rtl ? box.x + box.w : box.x;
  lines.forEach((line, i) => {
    const y = box.y + i * size * 1.05;
    if (style.stroke) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = size * 0.16;
      ctx.strokeText(line, x, y);
    }
    ctx.fillStyle = style.fill;
    ctx.fillText(line, x, y);
  });
  ctx.restore();
}

/** Draws the cut-out scaled to the canvas height, anchored to one side. */
function drawPerson(
  ctx: CanvasRenderingContext2D,
  person: HTMLCanvasElement,
  side: "left" | "right" | "center",
  heightRatio: number,
  glow?: string
) {
  const h = THUMB_HEIGHT * heightRatio;
  const w = (person.width / person.height) * h;
  const x = side === "left" ? -w * 0.08 : side === "right" ? THUMB_WIDTH - w * 0.92 : (THUMB_WIDTH - w) / 2;
  const y = THUMB_HEIGHT - h;
  if (glow) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 40;
    ctx.drawImage(person, x, y, w, h);
    ctx.restore();
  }
  ctx.drawImage(person, x, y, w, h);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png")
  );
}

function newCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_WIDTH;
  canvas.height = THUMB_HEIGHT;
  return [canvas, canvas.getContext("2d")!];
}

function isRtl(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

/** Dark sage gradient, person right, giant white headline left. */
function templateBold(person: HTMLCanvasElement | null, frame: HTMLCanvasElement, headline: string) {
  const [canvas, ctx] = newCanvas();
  const bg = ctx.createLinearGradient(0, 0, THUMB_WIDTH, THUMB_HEIGHT);
  bg.addColorStop(0, "#10140f");
  bg.addColorStop(1, "#2f5a41");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT);
  if (person) drawPerson(ctx, person, "right", 1, "rgba(130,171,145,0.9)");
  else ctx.drawImage(frame, THUMB_WIDTH * 0.45, 0, THUMB_WIDTH * 0.55, THUMB_HEIGHT);
  ctx.fillStyle = "#82ab91";
  ctx.fillRect(60, 120, 16, 480);
  drawHeadline(ctx, headline, { x: 100, y: 130, w: THUMB_WIDTH * 0.5, h: 470 }, { fill: "#ffffff", stroke: "#000000", maxSize: 150, rtl: isRtl(headline) });
  return canvas;
}

/** Bright yellow, person left, black headline on a white block right. */
function templateSplit(person: HTMLCanvasElement | null, frame: HTMLCanvasElement, headline: string) {
  const [canvas, ctx] = newCanvas();
  ctx.fillStyle = "#ffd60a";
  ctx.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT);
  ctx.fillStyle = "#ff3b30";
  ctx.beginPath();
  ctx.arc(THUMB_WIDTH * 0.28, THUMB_HEIGHT * 0.55, 330, 0, Math.PI * 2);
  ctx.fill();
  if (person) drawPerson(ctx, person, "left", 0.98);
  else ctx.drawImage(frame, 0, 0, THUMB_WIDTH * 0.55, THUMB_HEIGHT);
  ctx.save();
  ctx.translate(THUMB_WIDTH * 0.57, 170);
  ctx.rotate(-0.04);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-20, -20, THUMB_WIDTH * 0.41, 420);
  ctx.restore();
  drawHeadline(ctx, headline, { x: THUMB_WIDTH * 0.57, y: 170, w: THUMB_WIDTH * 0.37, h: 370 }, { fill: "#111111", maxSize: 130, rtl: isRtl(headline) });
  return canvas;
}

/** The original frame blurred and darkened, centered glowing cut-out, yellow headline on top. */
function templateSpotlight(person: HTMLCanvasElement | null, frame: HTMLCanvasElement, headline: string) {
  const [canvas, ctx] = newCanvas();
  ctx.filter = "blur(18px) brightness(0.45) saturate(1.3)";
  const scale = Math.max(THUMB_WIDTH / frame.width, THUMB_HEIGHT / frame.height) * 1.1;
  ctx.drawImage(frame, (THUMB_WIDTH - frame.width * scale) / 2, (THUMB_HEIGHT - frame.height * scale) / 2, frame.width * scale, frame.height * scale);
  ctx.filter = "none";
  // Person kept below the headline band so the text never covers the face
  if (person) drawPerson(ctx, person, "center", 0.74, "rgba(255,255,255,0.9)");
  drawHeadline(ctx, headline, { x: 60, y: 30, w: THUMB_WIDTH - 120, h: 170 }, { fill: "#ffd60a", stroke: "#000000", maxSize: 140, rtl: isRtl(headline) });
  return canvas;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function generateThumbnails(
  file: File,
  durationSeconds: number,
  ideas: ThumbnailIdea[],
  onStage: (stage: ThumbnailStage) => void = () => {}
): Promise<{ thumbnails: GeneratedThumbnail[]; faceFound: boolean }> {
  onStage("loading");
  const loaded = loadModels();
  onStage("frames");
  const frames = await sampleFrames(file, durationSeconds);
  const { detector, segmenter } = await loaded;

  onStage("faces");
  const best = scoreFrames(detector, frames);

  onStage("cutout");
  const person = best.face ? cutOut(segmenter, best.frame, best.face) : null;

  onStage("drawing");
  await document.fonts.ready;
  const headlines = [0, 1, 2].map((i) => ideas[i]?.headline ?? ideas[0]?.headline ?? "WATCH THIS");
  const canvases = [
    { template: "bold" as const, canvas: templateBold(person, best.frame, headlines[0]!) },
    { template: "split" as const, canvas: templateSplit(person, best.frame, headlines[1]!) },
    { template: "spotlight" as const, canvas: templateSpotlight(person, best.frame, headlines[2]!) },
  ];
  const thumbnails = await Promise.all(
    canvases.map(async ({ template, canvas }) => {
      const blob = await canvasToBlob(canvas);
      return { template, blob, url: URL.createObjectURL(blob) };
    })
  );
  return { thumbnails, faceFound: best.face !== null };
}
