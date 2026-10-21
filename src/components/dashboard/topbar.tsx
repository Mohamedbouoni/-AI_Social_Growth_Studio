"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Gift, MessageCircle, Search, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { useCoach } from "./coach-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IconComponent } from "./stat-tile";

// Route prefix → t.shell keys for the page title and subtitle.
// Anything else under /dashboard falls back to the overview title.
const PAGE_TITLES: { prefix: string; title: string; subtitle: string }[] = [
  { prefix: "/dashboard/studio", title: "studioTitle", subtitle: "studioSubtitle" },
  { prefix: "/dashboard/library", title: "libraryTitle", subtitle: "librarySubtitle" },
  { prefix: "/dashboard/calendar", title: "calendarTitle", subtitle: "calendarSubtitle" },
  { prefix: "/dashboard/analytics", title: "analyticsTitle", subtitle: "analyticsSubtitle" },
  { prefix: "/dashboard/settings", title: "settingsTitle", subtitle: "settingsSubtitle" },
  { prefix: "/dashboard/billing", title: "billingTitle", subtitle: "billingSubtitle" },
];
const OVERVIEW_TITLE = { prefix: "/dashboard", title: "overviewTitle", subtitle: "overviewSubtitle" };

const iconButtonClass =
  "relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-card text-foreground shadow-card transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-sage px-1 text-[11px] font-bold text-sage-foreground tabular-nums ring-2 ring-background">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { openCoach } = useCoach();

  const [query, setQuery] = useState("");
  const [noticesSeen, setNoticesSeen] = useState(false);

  const page = PAGE_TITLES.find((entry) => pathname.startsWith(entry.prefix)) ?? OVERVIEW_TITLE;

  // Onboarding tips until real notifications exist
  const notices: {
    id: string;
    icon: IconComponent;
    title: string | undefined;
    body: string | undefined;
    onSelect: () => void;
  }[] = [
    {
      id: "welcome",
      icon: Gift,
      title: t.shell.welcomeNoticeTitle,
      body: t.shell.welcomeNoticeBody,
      onSelect: () => router.push("/dashboard/studio"),
    },
    {
      id: "coach",
      icon: Sparkles,
      title: t.shell.coachNoticeTitle,
      body: t.shell.coachNoticeBody,
      onSelect: () => openCoach(),
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    openCoach(query.trim());
    setQuery("");
  };

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Logo mark + page title */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link
          href="/dashboard"
          aria-label={t.brand}
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-card transition-opacity hover:opacity-90"
        >
          <Sparkles className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-2xl leading-tight font-bold tracking-tight sm:text-[1.75rem]">
            {t.shell[page.title]}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{t.shell[page.subtitle]}</p>
        </div>
      </div>

      {/* Search pill + icon buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        <form
          role="search"
          onSubmit={handleSearch}
          className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-card ps-5 pe-1.5 shadow-card focus-within:ring-3 focus-within:ring-ring/30 lg:w-[22rem] lg:flex-none xl:w-[26rem]"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.shell.searchPlaceholder}
            aria-label={t.shell.search}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label={t.shell.search}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-85"
          >
            <Search className="size-4" />
          </button>
        </form>

        <button
          type="button"
          aria-label={t.shell.messages}
          onClick={() => openCoach()}
          className={iconButtonClass}
        >
          <MessageCircle className="size-5" />
        </button>

        <DropdownMenu onOpenChange={(open) => open && setNoticesSeen(true)}>
          <DropdownMenuTrigger aria-label={t.shell.notifications} className={iconButtonClass}>
            <Bell className="size-5" />
            <CountBadge count={noticesSeen ? 0 : notices.length} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-80 rounded-xl p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold text-foreground">
                {t.shell.notifications}
              </DropdownMenuLabel>
              {notices.map((notice) => {
                const Icon = notice.icon;
                return (
                  <DropdownMenuItem
                    key={notice.id}
                    onClick={notice.onSelect}
                    className="items-start gap-3 rounded-lg p-2"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage-softer text-sage">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{notice.title}</span>
                      <span className="block text-xs text-muted-foreground">{notice.body}</span>
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
