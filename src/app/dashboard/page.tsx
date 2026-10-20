"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  ArrowRight,
  ArrowUpRight,
  Clock,
  TrendingUp,
  FolderOpen,
  Plus,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { YouTubeIcon, TikTokIcon, InstagramIcon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { t, language, dir } = useLanguage();

  const [quickIdea, setQuickIdea] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<
    "youtube" | "tiktok" | "instagram"
  >("youtube");

  const handleQuickLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickIdea.trim()) return;
    router.push(
      `/dashboard/studio?platform=${selectedPlatform}&idea=${encodeURIComponent(
        quickIdea
      )}`
    );
  };

  // Mock initial projects for demonstration
  const recentProjects = [
    {
      id: "proj-1",
      title: "5 Micro-Habits That Doubled My Deep Work in 2026",
      niche: "Productivity & Tech",
      platform: "youtube",
      contentType: "video",
      status: "draft",
      date: "2 hours ago",
    },
    {
      id: "proj-2",
      title: "Why 90% of Creators Fail on TikTok Within 30 Days",
      niche: "Content Strategy",
      platform: "tiktok",
      contentType: "short",
      status: "planned",
      date: "Yesterday",
    },
    {
      id: "proj-3",
      title: "The Zero-Dollar Solo SaaS Tech Stack Breakdown",
      niche: "SaaS & Coding",
      platform: "instagram",
      contentType: "carousel",
      status: "draft",
      date: "3 days ago",
    },
  ];

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "youtube":
        return <YouTubeIcon className="size-4" />;
      case "tiktok":
        return <TikTokIcon className="size-4" />;
      case "instagram":
        return <InstagramIcon className="size-4" />;
      default:
        return <Sparkles className="size-4 text-violet-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Greeting & Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t.dashboard.greeting} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t.dashboard.subtitle}
          </p>
        </div>

        <Link href="/dashboard/studio">
          <Button className="bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 hover:opacity-95 text-white font-semibold shadow-md shadow-indigo-500/20 cursor-pointer">
            <Plus className="size-4 mr-2" />
            <span>New Generation</span>
          </Button>
        </Link>
      </div>

      {/* Quick Launchpad Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 border border-indigo-900/40 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-60 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur border border-white/10 text-pink-300">
            <Sparkles className="size-3.5" />
            <span>Instant Idea Engine</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {language === "ar"
              ? "حوّل فكرتك التالية إلى خطافات ونصوص متفجرة فوراً"
              : "Generate viral content hooks & scripts from your next idea"}
          </h2>

          <form onSubmit={handleQuickLaunch} className="space-y-3">
            {/* Platform pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { id: "youtube", label: "YouTube", icon: YouTubeIcon },
                { id: "tiktok", label: "TikTok", icon: TikTokIcon },
                { id: "instagram", label: "Instagram", icon: InstagramIcon },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPlatform === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setSelectedPlatform(
                        p.id as "youtube" | "tiktok" | "instagram"
                      )
                    }
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? "bg-white text-slate-950 shadow-md font-bold"
                        : "bg-white/10 text-slate-200 hover:bg-white/20"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Prompt input with generate button */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Input
                placeholder={
                  language === "ar"
                    ? "اكتب فكرتك هنا (مثلاً: 3 أسرار لزيادة المبيعات بمتجرك)..."
                    : "Enter an idea (e.g. 3 overlooked habits that 10x developer productivity)..."
                }
                value={quickIdea}
                onChange={(e) => setQuickIdea(e.target.value)}
                className="bg-white/10 border-white/15 text-white placeholder:text-slate-400 focus-visible:ring-indigo-400 text-sm h-11"
              />
              <Button
                type="submit"
                className="h-11 px-6 bg-white text-indigo-950 hover:bg-slate-100 font-bold text-sm shrink-0 shadow-lg cursor-pointer"
              >
                <span>{language === "ar" ? "ابدأ التوليد" : "Launch Studio"}</span>
                <ArrowRight className="size-4 ml-2 rtl:rotate-180" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Credits remaining */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t.dashboard.creditsRemaining}
            </CardTitle>
            <div className="size-8 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
              <Zap className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">7 / 10</div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                style={{ width: "70%" }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Resets in 11 days · Free Tier
            </p>
          </CardContent>
        </Card>

        {/* Connected accounts */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t.dashboard.connectedAccounts}
            </CardTitle>
            <div className="size-8 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center">
              <InstagramIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">3 Platforms</div>
            <div className="flex items-center gap-1.5 pt-1">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
              >
                ● YT Ready
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
              >
                ● TT Ready
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
              >
                ● IG Ready
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Saved Drafts */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t.dashboard.savedDrafts}
            </CardTitle>
            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <FolderOpen className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">14 Drafts</div>
            <p className="text-[11px] text-muted-foreground">
              Across 3 channels · Ready to publish
            </p>
          </CardContent>
        </Card>

        {/* Growth Coach Score */}
        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Hook Retention Score
            </CardTitle>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold text-emerald-600">+42%</div>
            <p className="text-[11px] text-muted-foreground">
              Based on structured high-retention frameworks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent Projects & Growth Coach */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="size-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight">
                {t.dashboard.recentProjects}
              </h2>
            </div>
            <Link
              href="/dashboard/library"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>{t.dashboard.viewAll}</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentProjects.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition"
              >
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {getPlatformIcon(p.platform)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold leading-tight hover:text-primary cursor-pointer line-clamp-1">
                      {p.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.niche}</span>
                      <span>•</span>
                      <span className="capitalize">{p.contentType}</span>
                      <span>•</span>
                      <span>{p.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Badge
                    variant={p.status === "planned" ? "secondary" : "outline"}
                    className="text-[10px] capitalize"
                  >
                    {p.status}
                  </Badge>
                  <Link href={`/dashboard/studio?projectId=${p.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 cursor-pointer"
                    >
                      Open
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Growth Coach & Tips */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-tight">
              Growth Coach Insight
            </h2>
          </div>

          <Card className="border-border/80 bg-gradient-to-br from-card to-muted/40 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Lightbulb className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {language === "ar"
                      ? "قاعدة الـ 3 ثوانٍ في تيك توك وريلز"
                      : "The 3-Second Hook Rule"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {language === "ar"
                      ? "الفيديوهات التي تبدأ بسؤال يتحدى مفهوماً شائعاً تحقق معدل إكمال أعلى بنسبة 42%. جرب صيغة: 'توقف عن فعل هذا إذا كنت تريد...'"
                      : "Videos starting with a counter-intuitive question or challenge achieve 42% higher completion rates. Try the: 'Stop doing X if you want Y' framework."}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <Link
                  href="/dashboard/studio?platform=tiktok&preset=viral-hook"
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold cursor-pointer justify-between"
                  >
                    <span>
                      {language === "ar"
                        ? "جرّب صيغة الخطاف الفيروسي"
                        : "Try Viral Hook Preset"}
                    </span>
                    <ArrowRight className="size-3.5 rtl:rotate-180" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Social Platform Connection Prompt Card */}
          <Card className="border-dashed border-border bg-muted/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sparkles className="size-3.5 text-violet-500" />
                <span>Multi-Platform Studio</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.dashboard.connectPlatformCTA}
              </p>
              <Link href="/dashboard/settings?tab=connections">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs font-semibold cursor-pointer"
                >
                  Manage Channels
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
