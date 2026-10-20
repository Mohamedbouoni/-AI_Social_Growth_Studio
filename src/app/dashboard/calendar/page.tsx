"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Video,
  Layers,
  Sparkles,
} from "lucide-react";
import { YouTubeIcon, TikTokIcon, InstagramIcon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScheduledEvent {
  day: number;
  platform: "youtube" | "tiktok" | "instagram";
  title: string;
  time: string;
}

export default function CalendarPage() {
  const { t, language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState("October 2026");

  const events: ScheduledEvent[] = [
    {
      day: 6,
      platform: "youtube",
      title: "5 Micro-Habits Video",
      time: "18:00",
    },
    {
      day: 12,
      platform: "tiktok",
      title: "Why Creators Fail Hook",
      time: "14:30",
    },
    {
      day: 15,
      platform: "instagram",
      title: "Zero-Dollar Stack Carousel",
      time: "12:00",
    },
    {
      day: 21,
      platform: "youtube",
      title: "Solo SaaS Deep Dive",
      time: "19:00",
    },
    {
      day: 24,
      platform: "tiktok",
      title: "3 AI Prompts Reel",
      time: "16:00",
    },
    {
      day: 28,
      platform: "instagram",
      title: "Audience Growth Blueprint",
      time: "11:00",
    },
  ];

  const daysInMonth = 31;
  const startDayOffset = 4; // Thursday

  const daysOfWeek =
    language === "ar"
      ? ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getPlatformIcon = (p: string) => {
    switch (p) {
      case "youtube":
        return <YouTubeIcon className="size-3" />;
      case "tiktok":
        return <TikTokIcon className="size-3" />;
      case "instagram":
        return <InstagramIcon className="size-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {t.nav.calendar}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your multi-platform release schedule and stay consistent
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 cursor-pointer"
            >
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </Button>
            <span className="text-xs font-bold px-2">{currentMonth}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 cursor-pointer"
            >
              <ChevronRight className="size-4 rtl:rotate-180" />
            </Button>
          </div>

          <Link href="/dashboard/studio">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground font-semibold cursor-pointer"
            >
              <Plus className="size-4 mr-1.5" />
              <span>Schedule Post</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-bold text-muted-foreground py-2.5">
            {daysOfWeek.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border min-h-[500px]">
            {/* Empty slots before month starts */}
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-muted/10 p-2 min-h-24" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = events.filter((e) => e.day === day);
              const isToday = day === 20;

              return (
                <div
                  key={`day-${day}`}
                  className={`p-2 min-h-24 flex flex-col justify-between transition hover:bg-muted/30 ${
                    isToday ? "bg-violet-500/5 ring-1 ring-inset ring-violet-500/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold size-5 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-primary text-primary-foreground font-extrabold"
                          : "text-foreground/80"
                      }`}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Events on this day */}
                  <div className="space-y-1 mt-1">
                    {dayEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-muted/80 text-[10px] font-semibold border border-border/60 hover:border-primary cursor-pointer truncate"
                        title={evt.title}
                      >
                        {getPlatformIcon(evt.platform)}
                        <span className="truncate">{evt.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
