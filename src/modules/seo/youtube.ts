// =============================================================================
// YouTube Data API v3 — top videos for a keyword
// =============================================================================
// search.list costs 100 of the 10,000 free daily quota units (~100 searches a
// day per Google Cloud project); videos.list costs 1. Results are cached per
// keyword + language for 24 h in memory, so repeated lookups cost nothing.
// =============================================================================

import { z } from "zod";
import { AppError } from "@/lib/errors";

const API = "https://www.googleapis.com/youtube/v3";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const RESULTS = 8;

export interface Competitor {
  videoId: string;
  title: string;
  channel: string;
  views: number | null;
  publishedAt: string;
  tags: string[];
  url: string;
}

const searchSchema = z.object({
  items: z.array(z.object({ id: z.object({ videoId: z.string().optional() }) })).default([]),
});

const videosSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          title: z.string(),
          channelTitle: z.string(),
          publishedAt: z.string(),
          tags: z.array(z.string()).optional(),
        }),
        statistics: z.object({ viewCount: z.string().optional() }).optional(),
      })
    )
    .default([]),
});

const cache = new Map<string, { at: number; data: Competitor[] }>();

export function youtubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

async function call(path: string, params: Record<string, string>): Promise<unknown> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new AppError(
      "SETUP_REQUIRED",
      "Competitor research needs YOUTUBE_API_KEY in .env.local (Google Cloud Console → YouTube Data API v3).",
      503
    );
  }
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key })}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (/quotaExceeded|dailyLimitExceeded|rateLimitExceeded/.test(body)) {
      throw new AppError(
        "QUOTA_EXCEEDED",
        "The YouTube search quota for today is used up. Competitor research will work again tomorrow.",
        503
      );
    }
    if (/keyInvalid|accessNotConfigured|API_KEY_INVALID|SERVICE_DISABLED|forbidden/i.test(body)) {
      throw new AppError(
        "SETUP_REQUIRED",
        "YouTube rejected YOUTUBE_API_KEY. Check the key and enable “YouTube Data API v3” in Google Cloud Console.",
        503
      );
    }
    throw new Error(`YouTube API error (${response.status}) on ${path}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

export async function topVideosFor(keyword: string, language?: string): Promise<Competitor[]> {
  const q = keyword.trim().slice(0, 100);
  const cacheKey = `${language ?? "*"}:${q.toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const search = searchSchema.parse(
    await call("search", {
      part: "id",
      type: "video",
      maxResults: String(RESULTS),
      order: "relevance",
      q,
      ...(language && /^[a-z]{2}$/.test(language) ? { relevanceLanguage: language } : {}),
    })
  );
  const ids = search.items.map((i) => i.id.videoId).filter((id): id is string => Boolean(id));

  let data: Competitor[] = [];
  if (ids.length) {
    const videos = videosSchema.parse(await call("videos", { part: "snippet,statistics", id: ids.join(",") }));
    data = videos.items.map((v) => ({
      videoId: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      views: v.statistics?.viewCount ? Number(v.statistics.viewCount) : null,
      publishedAt: v.snippet.publishedAt,
      tags: (v.snippet.tags ?? []).slice(0, 15),
      url: `https://www.youtube.com/watch?v=${v.id}`,
    }));
  }

  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(cacheKey, { at: Date.now(), data });
  return data;
}
