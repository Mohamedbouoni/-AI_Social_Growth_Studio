// =============================================================================
// Content display helpers shared by Overview, Library and Calendar
// =============================================================================

import React from "react";
import { InstagramIcon, TikTokIcon, YouTubeIcon } from "@/components/icons";
import type { TranslationData } from "@/lib/i18n/translations";
import type { LibraryItem } from "@/lib/queries/hooks";
import type { ProjectStatus, SocialPlatform } from "@/types";

export const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

/** Soft header tint per platform, like the property cards in the reference design */
export const PLATFORM_TINT: Record<SocialPlatform, string> = {
  youtube: "from-[#f4d6d2] to-[#fbeeec] dark:from-[#3b2422] dark:to-[#2a1d1c]",
  tiktok: "from-[#cfe6e4] to-[#ecf5f4] dark:from-[#1f3534] dark:to-[#182625]",
  instagram: "from-[#ecd5e6] to-[#f8eef5] dark:from-[#382334] dark:to-[#271b25]",
};

export function PlatformIcon({ platform, className }: { platform: SocialPlatform; className?: string }) {
  if (platform === "youtube") return <YouTubeIcon className={className} />;
  if (platform === "tiktok") return <TikTokIcon className={className} />;
  return <InstagramIcon className={className} />;
}

export function itemPlatforms(item: LibraryItem): SocialPlatform[] {
  return [...new Set(item.content_variants.map((v) => v.platform))];
}

export function statusLabel(status: ProjectStatus, t: TranslationData): string {
  return {
    draft: t.app.statusDraft,
    planned: t.app.statusPlanned,
    published: t.app.statusPublished,
    archived: t.app.statusArchived,
  }[status] ?? status;
}

export const STATUS_STYLE: Record<ProjectStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  planned: "bg-sage-softer text-sage",
  published: "bg-positive-soft text-positive",
  archived: "bg-muted text-muted-foreground/70",
};

/**
 * How ready a piece is to go live (0–100): generated is 40, a planned date
 * adds 30, each extra platform format adds 15, published is 100.
 */
export function readiness(item: LibraryItem): number {
  if (item.status === "published") return 100;
  const formats = item.content_variants.length;
  return Math.min(
    95,
    40 + (item.planned_date ? 30 : 0) + (formats >= 2 ? 15 : 0) + (formats >= 3 ? 15 : 0)
  );
}
