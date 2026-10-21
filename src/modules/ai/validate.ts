// =============================================================================
// LLM Output Parsing & Validation
// =============================================================================
// Free/open models are less strict about JSON than paid ones: they wrap output
// in markdown fences, return hashtags as one string, or overshoot list sizes.
// Normalize those quirks before validating against the platform schema.
// =============================================================================

import type { GeneratedContent, GenerationInput } from "./schemas";
import {
  youtubeOutputSchema,
  tiktokOutputSchema,
  instagramReelOutputSchema,
  instagramCarouselOutputSchema,
} from "./schemas";

// Upper bounds shared by all platform schemas (see schemas.ts)
const ARRAY_LIMITS: Record<string, number> = {
  titles: 5,
  tags: 30,
  hashtags: 15,
  thumbnailIdeas: 3,
  suggestedSounds: 3,
  slides: 10,
};

const SPLITTABLE_FIELDS = new Set(["tags", "hashtags", "titles"]);

export function extractJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced?.[1] ?? trimmed;

  try {
    return JSON.parse(body);
  } catch {
    // Some models add a sentence before/after the object — take the outermost braces
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start === -1 || end <= start) throw new SyntaxError("No JSON object in model output.");
    return JSON.parse(body.slice(start, end + 1));
  }
}

function normalize(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new SyntaxError("Model output is not a JSON object.");
  }

  // Unwrap { content: {...} } which some models echo back from the schema shape
  const obj = raw as Record<string, unknown>;
  const source =
    typeof obj.content === "object" && obj.content !== null && !Array.isArray(obj.content)
      ? (obj.content as Record<string, unknown>)
      : obj;

  const result: Record<string, unknown> = { ...source };
  for (const [key, limit] of Object.entries(ARRAY_LIMITS)) {
    let value = result[key];
    if (typeof value === "string" && SPLITTABLE_FIELDS.has(key)) {
      value = value.split(key === "titles" ? /\n+/ : /[\s,]+/).filter(Boolean);
    }
    if (Array.isArray(value)) {
      result[key] = value.slice(0, limit);
    }
  }
  return result;
}

/**
 * Parse raw model text into validated platform content.
 * Throws SyntaxError (bad JSON) or ZodError (wrong shape).
 */
export function parseGeneratedContent(
  input: GenerationInput,
  rawText: string
): GeneratedContent {
  const json = normalize(extractJson(rawText));

  switch (input.platform) {
    case "youtube":
      return { platform: "youtube", content: youtubeOutputSchema.parse(json) };
    case "tiktok":
      return { platform: "tiktok", content: tiktokOutputSchema.parse(json) };
    case "instagram":
      if (input.contentType === "carousel") {
        return {
          platform: "instagram",
          contentType: "carousel",
          content: instagramCarouselOutputSchema.parse(json),
        };
      }
      return {
        platform: "instagram",
        contentType: "reel",
        content: instagramReelOutputSchema.parse(json),
      };
  }
}
