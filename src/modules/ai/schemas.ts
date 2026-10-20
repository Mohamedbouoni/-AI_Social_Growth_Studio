// =============================================================================
// AI Generation Schemas — Zod validation for inputs and platform-specific outputs
// =============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const platformEnum = z.enum(["youtube", "tiktok", "instagram"]);
export type Platform = z.infer<typeof platformEnum>;

export const contentTypeEnum = z.enum([
  "video",
  "short",
  "reel",
  "carousel",
  "post",
  "story",
]);
export type ContentType = z.infer<typeof contentTypeEnum>;

export const languageEnum = z.enum(["en", "ar"]);
export type Language = z.infer<typeof languageEnum>;

export const toneEnum = z.enum([
  "professional",
  "casual",
  "humorous",
  "educational",
  "inspirational",
  "storytelling",
  "controversial",
  "urgent",
]);
export type Tone = z.infer<typeof toneEnum>;

export const generationInputSchema = z.object({
  platform: platformEnum,
  contentType: contentTypeEnum,
  language: languageEnum,
  niche: z.string().min(1).max(100),
  idea: z.string().min(1).max(2000),
  tone: toneEnum,
  requestId: z.string().uuid().optional(),
});

export type GenerationInput = z.infer<typeof generationInputSchema>;

// ---------------------------------------------------------------------------
// Output schemas — platform-specific
// ---------------------------------------------------------------------------

export const youtubeOutputSchema = z.object({
  titles: z.array(z.string()).min(1).max(5),
  description: z.string(),
  tags: z.array(z.string()).max(30),
  hashtags: z.array(z.string()).max(15),
  openingHook: z.string(),
  callToAction: z.string(),
  thumbnailIdeas: z.array(z.string()).max(3).optional(),
});

export type YouTubeOutput = z.infer<typeof youtubeOutputSchema>;

export const tiktokOutputSchema = z.object({
  openingHook: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()).max(15),
  script: z.string(),
  callToAction: z.string(),
  suggestedSounds: z.array(z.string()).max(3).optional(),
});

export type TikTokOutput = z.infer<typeof tiktokOutputSchema>;

export const instagramReelOutputSchema = z.object({
  openingHook: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()).max(30),
  callToAction: z.string(),
  script: z.string(),
  suggestedAudioMood: z.string().optional(),
});

export type InstagramReelOutput = z.infer<typeof instagramReelOutputSchema>;

export const instagramCarouselOutputSchema = z.object({
  slides: z
    .array(
      z.object({
        heading: z.string(),
        body: z.string(),
      })
    )
    .min(3)
    .max(10),
  caption: z.string(),
  hashtags: z.array(z.string()).max(30),
  callToAction: z.string(),
});

export type InstagramCarouselOutput = z.infer<
  typeof instagramCarouselOutputSchema
>;

// ---------------------------------------------------------------------------
// Union type for all generated content
// ---------------------------------------------------------------------------

export const generatedContentSchema = z.discriminatedUnion("platform", [
  z.object({ platform: z.literal("youtube"), content: youtubeOutputSchema }),
  z.object({ platform: z.literal("tiktok"), content: tiktokOutputSchema }),
  z.object({
    platform: z.literal("instagram"),
    contentType: z.literal("reel"),
    content: instagramReelOutputSchema,
  }),
  z.object({
    platform: z.literal("instagram"),
    contentType: z.literal("carousel"),
    content: instagramCarouselOutputSchema,
  }),
]);

export type GeneratedContent = z.infer<typeof generatedContentSchema>;
