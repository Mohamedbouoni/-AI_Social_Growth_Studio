"use client";

import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  Share2,
  Bookmark,
  Sparkles,
  ArrowUpRight,
  Lightbulb,
} from "lucide-react";
import { YouTubeIcon, TikTokIcon, InstagramIcon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  const { t, language } = useLanguage();
  const [platformFilter, setPlatformFilter] = useState("all");

  const platformStats = [
    {
      platform: "youtube",
      name: "YouTube Channel",
      icon: YouTubeIcon,
      views: "142.8K",
      viewsGrowth: "+24.5%",
      ctr: "7.8%",
      retention: "54%",
      topFormat: "Long-form Tutorials",
    },
    {
      platform: "tiktok",
      name: "TikTok Account",
      icon: TikTokIcon,
      views: "389.2K",
      viewsGrowth: "+62.1%",
      ctr: "12.4%",
      retention: "68%",
      topFormat: "Viral Problem-Hook",
    },
    {
      platform: "instagram",
      name: "Instagram Professional",
      icon: InstagramIcon,
      views: "89.4K",
      viewsGrowth: "+18.3%",
      ctr: "9.1%",
      retention: "61%",
      topFormat: "Educational Carousels",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {t.nav.analytics}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare retention, engagement, and reach metrics across connected channels
          </p>
        </div>

        <Badge variant="outline" className="text-xs px-2.5 py-1 text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
          ● Data Updated 2 hrs ago
        </Badge>
      </div>

      {/* Aggregate Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Cross-Platform Views
            </CardTitle>
            <Eye className="size-4 text-violet-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-extrabold">621.4K</div>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="size-3.5" />
              <span>+38.2% vs last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Average 3-Sec Retention
            </CardTitle>
            <TrendingUp className="size-4 text-pink-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-extrabold">64.2%</div>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp className="size-3.5" />
              <span>+14.5% using AI hooks</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Saves & Bookmarks
            </CardTitle>
            <Bookmark className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-extrabold">12.8K</div>
            <p className="text-xs text-muted-foreground">High-intent intent signal</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Shares
            </CardTitle>
            <Share2 className="size-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-extrabold">8.4K</div>
            <p className="text-xs text-muted-foreground">Organic virality driver</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {platformStats.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.platform} className="border-border bg-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="size-4" />
                    </div>
                    <h3 className="text-sm font-bold">{p.name}</h3>
                  </div>
                  <Badge variant="outline" className="text-xs text-emerald-600">
                    {p.viewsGrowth}
                  </Badge>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Estimated Views:</span>
                    <span className="font-bold">{p.views}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Click-Through Rate (CTR):</span>
                    <span className="font-bold">{p.ctr}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Audience Retention:</span>
                    <span className="font-bold">{p.retention}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Top Performing Format:</span>
                    <span className="font-semibold text-primary">{p.topFormat}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Growth Coach Experiments Section */}
      <Card className="border-border/80 bg-gradient-to-br from-indigo-950/20 via-background to-violet-950/20">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Lightbulb className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Growth Coach Experiments for You</h2>
              <p className="text-xs text-muted-foreground">
                Actionable experiments derived from your recent content performance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-border bg-card/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-500 uppercase">
                  Experiment #1 · TikTok
                </span>
                <Badge variant="outline" className="text-[10px]">
                  High Impact
                </Badge>
              </div>
              <p className="text-xs font-semibold">
                Test 2-Second Question Hooks vs Statement Hooks
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your question hooks averaged 68% 3-sec retention compared to 49% for statement hooks. Double down on provocative questions.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-500 uppercase">
                  Experiment #2 · Instagram
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Viral Reach
                </Badge>
              </div>
              <p className="text-xs font-semibold">
                7-Slide Carousels with Summary Cheat Sheet
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Carousels with a dedicated summary slide received 3.1x more bookmarks and saves than 4-slide carousels.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
