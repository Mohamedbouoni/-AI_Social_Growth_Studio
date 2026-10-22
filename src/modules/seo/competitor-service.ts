// =============================================================================
// Competitor research — top YouTube videos for the topic + ranking titles
// =============================================================================
// 1 credit: fetch the top videos for the main keyword (cached 24 h), then one
// AI call writes titles meant to sit next to them in Suggested videos and
// lists the keywords competitors use that the creator's package is missing.
// =============================================================================

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getEntitlement } from "@/modules/billing/entitlement";
import { recordUsageDetails, releaseCredits, reserveCredits } from "@/modules/billing/credits";
import { getAIProvider } from "@/modules/ai/provider-factory";
import type { ChatMessage } from "@/modules/ai/provider";
import { frequentTerms } from "./seo-score";
import { topVideosFor, youtubeConfigured, type Competitor } from "./youtube";
import { AppError } from "@/lib/errors";

export const competitorInputSchema = z.object({
  keyword: z.string().trim().min(2).max(100),
  language: z.string().trim().min(2).max(12).optional(),
  titles: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
  tags: z.array(z.string().trim().max(100)).max(30).default([]),
  requestId: z.string().uuid().optional(),
});

const text = z.string().trim().min(1);
const suggestionsSchema = z.object({
  rankingTitles: z
    .preprocess((v) => (Array.isArray(v) ? v.slice(0, 3) : v), z.array(z.object({ text, why: text })))
    .pipe(z.array(z.object({ text, why: text })).min(1)),
  missingKeywords: z.preprocess((v) => (Array.isArray(v) ? v.slice(0, 10) : v), z.array(text)),
  descriptionOpening: text,
});

export type CompetitorSuggestions = z.infer<typeof suggestionsSchema>;

export interface CompetitorResult {
  competitors: Competitor[];
  commonTerms: string[];
  suggestions: CompetitorSuggestions | null;
  creditsRemaining: number;
}

function buildMessages(input: z.infer<typeof competitorInputSchema>, competitors: Competitor[], terms: string[]): ChatMessage[] {
  const list = competitors
    .map((c, i) => `${i + 1}. "${c.title}" — ${c.channel}${c.views != null ? `, ${c.views.toLocaleString("en")} views` : ""}${c.tags.length ? ` | tags: ${c.tags.slice(0, 8).join(", ")}` : ""}`)
    .join("\n");
  return [
    {
      role: "system",
      content: `You are a YouTube SEO strategist. Using the real top-ranking videos for the creator's keyword, write titles designed to appear next to them in YouTube's Suggested videos: reuse their high-intent search terms, but promise a clearly different or better angle. Write in the same language as the creator's titles. Never copy a competitor title. Never invent statistics.
Return ONLY JSON: {"rankingTitles":[{"text":"<40-65 chars>","why":"<one sentence>"}],"missingKeywords":["<terms competitors use that the creator does not>"],"descriptionOpening":"<first 2 lines of the description, with the main keyword in the first sentence>"}`,
    },
    {
      role: "user",
      content: `KEYWORD: ${input.keyword}
CREATOR'S TITLES:\n${input.titles.map((t) => `- ${t}`).join("\n")}
CREATOR'S TAGS: ${input.tags.join(", ") || "(none)"}
FREQUENT TERMS IN COMPETITOR TITLES: ${terms.join(", ") || "(none)"}
TOP VIDEOS FOR THIS KEYWORD:\n${list}`,
    },
  ];
}

function sampleSuggestions(keyword: string): CompetitorSuggestions {
  return {
    rankingTitles: [
      { text: `${keyword}: The Honest Beginner Guide (No Fluff)`, why: "Targets the same search with a clearer promise than the top results." },
      { text: `I Tried Every ${keyword} Tip So You Don't Have To`, why: "Experience angle stands out next to list-style competitors." },
      { text: `${keyword} in 2026: What Actually Works Now`, why: "Freshness signal against older top videos." },
    ],
    missingKeywords: ["for beginners", "step by step", "tips"],
    descriptionOpening: `Everything about ${keyword}, explained step by step. In this video you will learn what actually works and what to skip.`,
  };
}

export async function competitorService(userId: string, rawInput: unknown): Promise<CompetitorResult> {
  const input = competitorInputSchema.parse(rawInput);
  if (!youtubeConfigured()) {
    throw new AppError(
      "SETUP_REQUIRED",
      "Competitor research needs YOUTUBE_API_KEY in .env.local (Google Cloud Console → YouTube Data API v3).",
      503
    );
  }

  const requestId = input.requestId || crypto.randomUUID();
  const supabase = createAdminClient();
  const entitlement = await getEntitlement(supabase, userId);
  const used = await reserveCredits(supabase, entitlement, { requestId, kind: "generation", model: "seo-competitors" });

  try {
    const competitors = await topVideosFor(input.keyword, input.language);
    const terms = frequentTerms(competitors.map((c) => c.title));

    let suggestions: CompetitorSuggestions | null = null;
    if (competitors.length > 0) {
      const provider = getAIProvider({
        tier: entitlement.config.features.qualityModel ? "quality" : "fast",
        language: input.language === "ar" ? "ar" : "auto",
      });
      const result = await provider.generateStructured(buildMessages(input, competitors, terms), suggestionsSchema, {
        mock: () => sampleSuggestions(input.keyword),
      });
      suggestions = result.data;
      await recordUsageDetails(supabase, entitlement.workspaceId, requestId, result.providerName, result.usage);
    }

    return {
      competitors,
      commonTerms: terms,
      suggestions,
      creditsRemaining: Math.max(0, entitlement.config.credits - used),
    };
  } catch (err) {
    await releaseCredits(supabase, entitlement.workspaceId, requestId);
    throw err;
  }
}
