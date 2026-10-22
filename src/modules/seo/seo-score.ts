// =============================================================================
// YouTube SEO checklist score
// =============================================================================
// A transparent 0-100 optimization score for a title + description + tags.
// It checks known YouTube best practices; it is NOT a ranking prediction and
// has no search-volume data, so the UI calls it an "optimization score".
// Pure function: runs in the browser and on the server.
// =============================================================================

export type SeoCheckId =
  | "keywordInTitle"
  | "titleLength"
  | "keywordInDescriptionStart"
  | "descriptionLength"
  | "chapters"
  | "tags"
  | "hashtags"
  | "callToAction"
  | "titleStyle"
  | "competitorTerms";

export interface SeoCheck {
  id: SeoCheckId;
  passed: boolean;
  points: number;
  maxPoints: number;
  /** Measured value shown next to the check, e.g. "58 characters" */
  detail?: string;
}

export interface SeoInput {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  /** Main search phrase; defaults to the first tag */
  keyword?: string;
  /** Frequent terms in competitor titles, when competitor data was loaded */
  competitorTerms?: string[];
}

export interface SeoResult {
  score: number;
  keyword: string;
  checks: SeoCheck[];
}

const CTA_PATTERN =
  /\b(subscribe|comment|like|share|follow|link in|download|join)\b|اشترك|علّق|علق|شارك|تابع|متابعة|اضغط/i;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ً-ٟ]/g, "") // Arabic diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Arabic attaches the article and short prepositions to the word: "للسفر" = "لل" + "سفر"
const ARABIC_PREFIX = /^(وال|بال|فال|كال|لل|ال|و|ب|ل|ف|ك)(?=\p{L}{2,})/u;

function stem(word: string): string {
  return /\p{Script=Arabic}/u.test(word) ? word.replace(ARABIC_PREFIX, "") : word;
}

/**
 * True when every word of the keyword appears in the text, in any order.
 * Words match by prefix so plurals count ("video" matches "videos").
 */
function containsKeyword(text: string, keyword: string): boolean {
  const tokens = normalize(text).split(" ").map(stem);
  const words = normalize(keyword).split(" ").filter((w) => w.length > 1).map(stem);
  return words.length > 0 && words.every((w) => tokens.some((t) => t.startsWith(w)));
}

export function scoreSeo(input: SeoInput): SeoResult {
  const keyword = (input.keyword ?? input.tags[0] ?? "").replace(/^#/, "").trim();
  const title = input.title.trim();
  const description = input.description.trim();
  const checks: SeoCheck[] = [];
  const add = (id: SeoCheckId, maxPoints: number, passed: boolean, detail?: string, partial?: number) =>
    checks.push({ id, maxPoints, passed, points: passed ? maxPoints : partial ?? 0, detail });

  add("keywordInTitle", 15, keyword !== "" && containsKeyword(title, keyword), keyword ? `“${keyword}”` : undefined);

  const len = [...title].length;
  add("titleLength", 10, len >= 40 && len <= 70, `${len}`, len >= 30 && len <= 80 ? 5 : 0);

  const opening = description.slice(0, 160);
  add("keywordInDescriptionStart", 15, keyword !== "" && containsKeyword(opening, keyword));

  add("descriptionLength", 10, description.length >= 250, `${description.length}`, description.length >= 120 ? 5 : 0);

  const stamps = description.match(/^\s*\d{1,2}:\d{2}(?::\d{2})?/gm) ?? [];
  const startsAtZero = /^\s*0?0:00/m.test(description);
  add("chapters", 15, stamps.length >= 3 && startsAtZero, `${stamps.length}`, stamps.length >= 1 ? 5 : 0);

  const tagChars = input.tags.join(",").length;
  add("tags", 10, input.tags.length >= 8 && tagChars <= 500, `${input.tags.length}`, input.tags.length >= 3 ? 5 : 0);

  const hashtagCount = input.hashtags.length || (description.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
  add("hashtags", 5, hashtagCount >= 1 && hashtagCount <= 5, `${hashtagCount}`, hashtagCount > 5 && hashtagCount <= 15 ? 2 : 0);

  add("callToAction", 10, CTA_PATTERN.test(description));

  const letters = title.replace(/[^\p{L}]/gu, "");
  const upperRatio = letters ? letters.replace(/[^\p{Lu}]/gu, "").length / letters.length : 0;
  add("titleStyle", 5, upperRatio < 0.7 && !/[!?]{2,}/.test(title));

  if (input.competitorTerms && input.competitorTerms.length > 0) {
    const used = input.competitorTerms.filter((term) => containsKeyword(`${title} ${input.tags.join(" ")}`, term));
    add("competitorTerms", 5, used.length >= 2, `${used.length}/${input.competitorTerms.length}`, used.length === 1 ? 2 : 0);
  }

  const max = checks.reduce((s, c) => s + c.maxPoints, 0);
  const got = checks.reduce((s, c) => s + c.points, 0);
  return { score: Math.round((got / max) * 100), keyword, checks };
}

const STOPWORDS = new Set(
  "the a an and or of to in on for with how what why is are you your my i this that it at by from be do 2024 2025 2026 vs".split(" ")
);

/** Most frequent meaningful words across competitor titles (for gap analysis). */
export function frequentTerms(titles: string[], limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const word of new Set(normalize(title).split(" "))) {
      if (word.length < 3 || STOPWORDS.has(word) || /^\d+$/.test(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}
