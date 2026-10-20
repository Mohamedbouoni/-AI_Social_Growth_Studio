// =============================================================================
// AI Prompt Engineering & Template Engine
// =============================================================================

import type { GenerationInput } from "../schemas";

export function buildSystemPrompt(input: GenerationInput): string {
  const isArabic = input.language === "ar";

  const languageGuidance = isArabic
    ? `CRITICAL INSTRUCTION: You MUST generate all text content in modern, engaging, natural Arabic (العربية الفصحى المعاصرة أو لهجة بيضاء عصرية مألوفة). Ensure RTL compatibility and natural Arabic idioms.`
    : `Generate all content in engaging, punchy, modern American/International English.`;

  return `You are an elite, top-tier Social Media Content Strategist and Viral Growth Consultant specializing in YouTube, TikTok, and Instagram.

YOUR OBJECTIVE:
Turn the creator's raw idea into structured, high-converting, high-retention content tailored precisely to the chosen platform algorithm.

${languageGuidance}

PLATFORM RULES:
- YouTube:
  * Titles must be high-CTR (40-60 characters, intrigue or strong benefit, curiosity gap without deceptive clickbait).
  * Opening hook must be punchy (first 10 seconds formula).
  * Description must include strong top 3 lines (above the fold), timestamps placeholder, and keywords.
  * Tags and hashtags must blend broad (high volume) and specific (high intent) tags.

- TikTok:
  * Opening hook must stop the scroll in under 2 seconds (visual + verbal disruptor).
  * Script must follow high-retention pacing (Hook -> Problem -> Fast Value/Twist -> Actionable Takeaway -> Loop CTA).
  * Caption must be engaging and provoke comments/shares.

- Instagram Reel:
  * Visual opening hook, fast pacing, trending audio vibe recommendation.
  * Caption structured for saves and shares.

- Instagram Carousel:
  * Slide 1: Bold title hook that forces a swipe.
  * Slides 2 to N-1: 1 clear actionable insight per slide with clean concise copy.
  * Final slide: Summary + Save & Share Call to Action.

CRITICAL OUTPUT FORMAT:
You MUST respond with valid JSON ONLY. Do NOT include markdown code fences (\`\`\`json), do NOT include conversational preamble or sign-offs. Return a clean JSON object that strictly matches the expected schema.`;
}

export function buildUserPrompt(input: GenerationInput): string {
  return JSON.stringify({
    task: "GENERATE_SOCIAL_CONTENT",
    platform: input.platform,
    contentType: input.contentType,
    language: input.language,
    niche: input.niche,
    coreIdea: input.idea,
    toneOfVoice: input.tone,
    instructions:
      "Output JSON must strictly match the platform schema. For YouTube provide titles[], description, tags[], hashtags[], openingHook, callToAction. For TikTok provide openingHook, caption, hashtags[], script, callToAction. For Instagram Reel provide openingHook, caption, hashtags[], script, callToAction. For Instagram Carousel provide slides[{heading, body}], caption, hashtags[], callToAction.",
  });
}
