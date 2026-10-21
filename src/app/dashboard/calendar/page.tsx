"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { formatDate, locale, toIsoDate } from "@/lib/i18n/format";
import { useLibrary, useUpdateProject, type LibraryItem } from "@/lib/queries/hooks";
import { PlatformIcon, itemPlatforms } from "@/lib/content";
import { cn } from "@/lib/utils";

const DRAG_TYPE = "application/x-content-id";

/** 6-week grid starting on Monday that covers the given month */
function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function CalendarPage() {
  const { t, language } = useLanguage();
  const { data: items = [], isLoading } = useLibrary({ limit: 200 });
  const updateProject = useUpdateProject();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const days = useMemo(() => monthGrid(month), [month]);
  const todayIso = toIsoDate(new Date());

  const byDate = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    for (const item of items) {
      if (!item.planned_date) continue;
      map.set(item.planned_date, [...(map.get(item.planned_date) ?? []), item]);
    }
    return map;
  }, [items]);

  const unscheduled = items.filter((i) => !i.planned_date && i.status !== "archived" && i.status !== "published");

  const weekdays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale(language), { weekday: "short" });
    // 2026-01-05 is a Monday
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2026, 0, 5 + i)));
  }, [language]);

  const schedule = (id: string, date: string | null) =>
    updateProject.mutate({ id, planned_date: date, status: date ? "planned" : "draft" });

  const shiftMonth = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
      <section className="rounded-xl bg-card p-4 shadow-card sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="flex-1 text-lg font-bold capitalize">
            {formatDate(month, language, { month: "long", year: "numeric" })}
          </h3>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
            className="h-9 cursor-pointer rounded-full bg-muted px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t.app.today}
          </button>
          <button type="button" onClick={() => shiftMonth(-1)} aria-label={t.app.previousMonth} className="grid size-9 cursor-pointer place-items-center rounded-full bg-muted hover:bg-accent">
            <ChevronLeft className="size-4 rtl:-scale-x-100" />
          </button>
          <button type="button" onClick={() => shiftMonth(1)} aria-label={t.app.nextMonth} className="grid size-9 cursor-pointer place-items-center rounded-full bg-muted hover:bg-accent">
            <ChevronRight className="size-4 rtl:-scale-x-100" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[42rem] grid-cols-7 gap-1.5">
            {weekdays.map((d) => (
              <div key={d} className="pb-1 text-center text-xs font-semibold text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const iso = toIsoDate(day);
              const inMonth = day.getMonth() === month.getMonth();
              const planned = byDate.get(iso) ?? [];
              return (
                <div
                  key={iso}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes(DRAG_TYPE)) {
                      e.preventDefault();
                      setDropTarget(iso);
                    }
                  }}
                  onDragLeave={() => setDropTarget((current) => (current === iso ? null : current))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropTarget(null);
                    const id = e.dataTransfer.getData(DRAG_TYPE);
                    if (id) schedule(id, iso);
                  }}
                  className={cn(
                    "flex min-h-24 flex-col gap-1 rounded-lg p-1.5 transition-colors",
                    inMonth ? "bg-muted/60" : "bg-transparent opacity-50",
                    dropTarget === iso && "bg-sage-soft ring-2 ring-sage"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums",
                      iso === todayIso && "bg-primary text-primary-foreground"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {planned.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData(DRAG_TYPE, item.id)}
                      title={item.title}
                      className="group flex cursor-grab items-center gap-1 rounded-md bg-card px-1.5 py-1 text-[11px] shadow-card"
                    >
                      <PlatformIcon platform={itemPlatforms(item)[0] ?? "youtube"} className="size-3 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => schedule(item.id, null)}
                        aria-label={t.app.unschedule}
                        className="hidden shrink-0 cursor-pointer text-muted-foreground group-hover:block hover:text-negative"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="rounded-xl bg-card p-4 shadow-card sm:p-6">
        <h3 className="mb-3 font-bold">{t.app.unscheduled}</h3>
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : unscheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.app.unscheduledEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {unscheduled.map((item) => (
              <li
                key={item.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData(DRAG_TYPE, item.id)}
                className="cursor-grab space-y-2 rounded-lg bg-muted p-3"
              >
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={itemPlatforms(item)[0] ?? "youtube"} className="size-4 shrink-0" />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</p>
                </div>
                {/* Date input as the touch-friendly alternative to drag and drop */}
                <input
                  type="date"
                  aria-label={`${t.app.pickDate}: ${item.title}`}
                  min={todayIso}
                  onChange={(e) => e.target.value && schedule(item.id, e.target.value)}
                  className="h-9 w-full rounded-full bg-card px-3 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
