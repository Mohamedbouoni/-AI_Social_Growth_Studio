"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Check, Copy, Download, Eye, Lock, Search, Sparkles, Trash2, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { fmt, formatDate } from "@/lib/i18n/format";
import {
  useDeleteProject,
  useLibrary,
  useUpdateProject,
  useUsage,
  type LibraryItem,
} from "@/lib/queries/hooks";
import {
  PLATFORM_NAMES,
  PLATFORM_TINT,
  PlatformIcon,
  STATUS_STYLE,
  itemPlatforms,
  readiness,
  statusLabel,
} from "@/lib/content";
import { PillTabs } from "@/components/dashboard/pill-tabs";
import { RingGauge } from "@/components/dashboard/ring-gauge";
import { useCoach } from "@/components/dashboard/coach-drawer";
import { useUpgrade } from "@/components/billing/upgrade-provider";
import { ContentPreview, contentToText } from "@/components/library/content-preview";
import { cn } from "@/lib/utils";
import type { ProjectStatus, SocialPlatform } from "@/types";

type Filter = "all" | SocialPlatform;
const STATUSES: ProjectStatus[] = ["draft", "planned", "published", "archived"];

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function exportCsv(items: LibraryItem[]) {
  const header = ["title", "niche", "status", "planned_date", "platforms", "tone", "language", "created_at"];
  const rows = items.map((i) =>
    [i.title, i.niche, i.status, i.planned_date ?? "", itemPlatforms(i).join(" "), i.tone, i.language, i.created_at]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );
  // BOM so Excel opens Arabic text correctly
  const blob = new Blob(["﻿" + [header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `content-library-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function LibraryPage() {
  const { t, language } = useLanguage();
  const { openCoach } = useCoach();
  const { openUpgrade } = useUpgrade();
  const { data: usage } = useUsage();
  const { data: items = [], isLoading, error } = useLibrary({ limit: 200 });
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<LibraryItem | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, youtube: 0, tiktok: 0, instagram: 0 };
    for (const item of items) for (const p of itemPlatforms(item)) c[p] += 1;
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (filter === "all" || itemPlatforms(item).includes(filter)) &&
        (!q || `${item.title} ${item.niche} ${item.source_idea}`.toLowerCase().includes(q))
    );
  }, [items, filter, query]);

  const onExport = () => {
    if (!usage?.features.exportLibrary) {
      openUpgrade(t.app.exportLocked);
      return;
    }
    exportCsv(visible);
  };

  const onDelete = (item: LibraryItem) => {
    if (window.confirm(t.app.confirmDelete)) deleteProject.mutate(item.id);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <PillTabs
          aria-label={t.studio.selectPlatform}
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: "all", label: t.app.all ?? "All", count: counts.all },
            ...(["youtube", "tiktok", "instagram"] as const).map((p) => ({
              value: p,
              label: PLATFORM_NAMES[p],
              count: counts[p],
            })),
          ]}
        />
        <div className="flex flex-1 items-center gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-card px-4 shadow-card">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.app.searchLibrary}
              aria-label={t.app.searchLibrary}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-card px-4 text-sm font-medium shadow-card transition-colors hover:bg-muted"
          >
            {usage?.features.exportLibrary ? <Download className="size-4" /> : <Lock className="size-4" />}
            <span className="hidden sm:inline">{t.app.exportCsv}</span>
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-negative-soft p-4 text-sm text-negative">
          {error.message}
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-card shadow-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl bg-card p-12 text-center shadow-card">
          <p className="text-muted-foreground">{t.app.emptyLibrary}</p>
          <Link href="/dashboard/studio" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            {t.app.openStudio}
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground shadow-card">{t.app.noResults}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((item) => {
            const platforms = itemPlatforms(item);
            const main = platforms[0] ?? "youtube";
            const formats = item.content_variants.length;
            return (
              <article key={item.id} className="flex flex-col gap-4 rounded-xl bg-card p-3 shadow-card">
                {/* Tinted header, like the property photos in the reference */}
                <button
                  type="button"
                  onClick={() => setViewing(item)}
                  aria-label={`${t.app.view}: ${item.title}`}
                  className={cn("relative grid h-32 cursor-pointer place-items-center overflow-hidden rounded-lg bg-gradient-to-br", PLATFORM_TINT[main])}
                >
                  <span className="flex gap-2">
                    {platforms.map((p) => (
                      <span key={p} className="grid size-12 place-items-center rounded-2xl bg-card/80 shadow-card backdrop-blur">
                        <PlatformIcon platform={p} className="size-6" />
                      </span>
                    ))}
                  </span>
                  <span className={cn("absolute top-3 end-3 rounded-full px-2.5 py-1 text-[11px] font-semibold", STATUS_STYLE[item.status])}>
                    {statusLabel(item.status, t)}
                  </span>
                </button>

                <div className="flex items-start gap-3 px-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 font-bold leading-snug">{item.title}</h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.niche} · {formatDate(item.created_at, language)}
                    </p>
                  </div>
                  <RingGauge value={readiness(item)} size={52} thickness={6} aria-label={t.app.completeness} />
                </div>

                <dl className="grid grid-cols-2 gap-2 px-2 text-center">
                  <div className="rounded-lg bg-muted px-1 py-2">
                    <dt className="text-[10px] text-muted-foreground">{t.app.formatLabel}</dt>
                    <dd className="text-xs font-semibold">{formats === 1 ? t.app.format : fmt(t.app.formats, { n: formats })}</dd>
                  </div>
                  <div className="rounded-lg bg-muted px-1 py-2">
                    <dt className="text-[10px] text-muted-foreground">{t.app.toneLabel}</dt>
                    <dd className="truncate text-xs font-semibold capitalize">{item.tone}</dd>
                  </div>
                </dl>

                <label className="mx-2 flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
                  <span className="text-[11px] text-muted-foreground">{t.app.statusLabel}</span>
                  <select
                    value={item.status}
                    onChange={(e) => updateProject.mutate({ id: item.id, status: e.target.value as ProjectStatus })}
                    className="cursor-pointer bg-transparent text-end text-xs font-semibold outline-none"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s, t)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => openCoach(fmt(t.app.askCoachPrompt, { title: item.title }), { projectId: item.id, title: item.title })}
                    className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border text-xs font-semibold transition-colors hover:bg-muted"
                  >
                    <Sparkles className="size-3.5" />
                    {t.app.askCoachAbout}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewing(item)}
                    aria-label={t.app.view}
                    className="grid size-10 cursor-pointer place-items-center rounded-full border border-border transition-colors hover:bg-muted"
                  >
                    <Eye className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    aria-label={t.app.delete}
                    className="grid size-10 cursor-pointer place-items-center rounded-full border border-border text-negative transition-colors hover:bg-negative-soft"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ContentViewer item={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function ContentViewer({ item, onClose }: { item: LibraryItem | null; onClose: () => void }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const variant = item?.content_variants[Math.min(tab, (item?.content_variants.length ?? 1) - 1)];

  const copy = async () => {
    if (!variant) return;
    await navigator.clipboard.writeText(contentToText(variant.output_json, t.app));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <DialogPrimitive.Root
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setTab(0);
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-card text-card-foreground shadow-float outline-none transition-[scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          {item && (
            <>
              <header className="flex items-start gap-3 p-5 pb-3">
                <DialogPrimitive.Title className="min-w-0 flex-1 text-lg font-bold leading-snug">{item.title}</DialogPrimitive.Title>
                <button
                  type="button"
                  onClick={copy}
                  aria-label={t.app.copy}
                  className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-muted transition-colors hover:bg-accent"
                >
                  {copied ? <Check className="size-4 text-positive" /> : <Copy className="size-4" />}
                </button>
                <DialogPrimitive.Close
                  aria-label={t.shell.close}
                  className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-muted transition-colors hover:bg-accent"
                >
                  <X className="size-4" />
                </DialogPrimitive.Close>
              </header>
              {item.content_variants.length > 1 && (
                <div className="px-5 pb-2">
                  <PillTabs
                    size="sm"
                    value={String(tab)}
                    onValueChange={(v) => setTab(Number(v))}
                    className="bg-muted shadow-none"
                    options={item.content_variants.map((v, i) => ({ value: String(i), label: PLATFORM_NAMES[v.platform] }))}
                  />
                </div>
              )}
              <div className="overflow-y-auto px-5 pb-5">{variant && <ContentPreview content={variant.output_json} labels={t.app} />}</div>
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
