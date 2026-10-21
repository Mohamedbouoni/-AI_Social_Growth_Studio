"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Copy,
  Check,
  RotateCw,
  Bookmark,
  Share2,
  ChevronRight,
  ChevronLeft,
  Flame,
  FileText,
  Hash,
  MessageSquare,
  Video,
  Layers,
  Zap,
  Sliders,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { YouTubeIcon, TikTokIcon, InstagramIcon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  Platform,
  ContentType,
  Tone,
  Language,
  GeneratedContent,
} from "@/modules/ai/schemas";

const DEFAULT_CONTENT_TYPE: Record<Platform, ContentType> = {
  youtube: "video",
  tiktok: "short",
  instagram: "carousel",
};

function AIStudioContent() {
  const searchParams = useSearchParams();
  const { t, language: appLanguage, dir } = useLanguage();

  // Pre-fill from query parameters
  const qPlatform = searchParams.get("platform");
  const initialPlatform: Platform =
    qPlatform === "tiktok" || qPlatform === "instagram" ? qPlatform : "youtube";

  // Form states
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [contentType, setContentType] = useState<ContentType>(
    DEFAULT_CONTENT_TYPE[initialPlatform]
  );
  const [tone, setTone] = useState<Tone>("educational");
  const [niche, setNiche] = useState("Productivity & Tech");
  const [idea, setIdea] = useState(() => searchParams.get("idea") ?? "");
  const [outputLanguage, setOutputLanguage] = useState<Language>("en");

  // Execution states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Adjust content type default when platform changes
  const handlePlatformChange = (p: Platform) => {
    setPlatform(p);
    if (p === "youtube") setContentType("video");
    if (p === "tiktok") setContentType("short");
    if (p === "instagram") setContentType("carousel");
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!idea.trim()) {
      setError("Please enter your core idea or topic first.");
      return;
    }

    setError(null);
    setLoading(true);
    setSavedSuccess(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          contentType,
          language: outputLanguage,
          niche,
          idea,
          tone,
          requestId: crypto.randomUUID(),
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Generation failed. Please try again.");
      }

      setResult(json.data);
      setCurrentSlideIndex(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToLibrary = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const sampleNiches = [
    "Productivity & Tech",
    "SaaS & Coding",
    "Fitness & Nutrition",
    "Personal Finance",
    "AI Tools",
  ];

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="size-4" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t.studio.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t.studio.subtitle}
          </p>
        </div>

        {/* Quick status pill */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge
            variant="outline"
            className="text-xs px-2.5 py-1 border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10 font-medium"
          >
            ⚡ Structured AI Engine Active
          </Badge>
        </div>
      </div>

      {/* Studio Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border/80 bg-card shadow-sm">
            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* 1. Platform Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{t.studio.selectPlatform}</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "youtube", label: "YouTube", icon: YouTubeIcon, color: "hover:border-red-500/50" },
                    { id: "tiktok", label: "TikTok", icon: TikTokIcon, color: "hover:border-cyan-500/50" },
                    { id: "instagram", label: "Instagram", icon: InstagramIcon, color: "hover:border-pink-500/50" },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = platform === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePlatformChange(p.id as Platform)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : `bg-muted/40 border-border text-foreground ${p.color}`
                        }`}
                      >
                        <Icon className="size-5 mb-1.5" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Content Format */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t.studio.selectContentType}
                </label>
                <div className="flex flex-wrap gap-2">
                  {platform === "youtube" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setContentType("video")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          contentType === "video"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 border-border hover:bg-muted text-foreground"
                        }`}
                      >
                        Long-Form Video & SEO
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentType("short")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          contentType === "short"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 border-border hover:bg-muted text-foreground"
                        }`}
                      >
                        YouTube Short
                      </button>
                    </>
                  )}

                  {platform === "tiktok" && (
                    <button
                      type="button"
                      onClick={() => setContentType("short")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border bg-primary text-primary-foreground border-primary cursor-pointer"
                    >
                      Viral Video Script
                    </button>
                  )}

                  {platform === "instagram" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setContentType("carousel")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          contentType === "carousel"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 border-border hover:bg-muted text-foreground"
                        }`}
                      >
                        Carousel (Swipe Slides)
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentType("reel")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          contentType === "reel"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 border-border hover:bg-muted text-foreground"
                        }`}
                      >
                        Instagram Reel
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 3. Niche & Suggestions */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t.studio.nicheLabel}
                </label>
                <Input
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder={t.studio.nichePlaceholder}
                  className="text-sm"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sampleNiches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setNiche(item)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Core Idea */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t.studio.ideaLabel}
                </label>
                <Textarea
                  rows={4}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder={t.studio.ideaPlaceholder}
                  className="text-sm leading-relaxed"
                />
              </div>

              {/* 5. Tone of Voice & Output Language */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t.studio.selectTone}
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as Tone)}
                    className="w-full text-xs font-medium h-9 rounded-md border border-border bg-background px-2.5 text-foreground cursor-pointer"
                  >
                    <option value="educational">Educational 📚</option>
                    <option value="storytelling">Storytelling 📖</option>
                    <option value="professional">Professional 👔</option>
                    <option value="casual">Casual ☕</option>
                    <option value="humorous">Humorous 🎭</option>
                    <option value="urgent">Urgent & Bold ⚡</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t.studio.languageLabel}
                  </label>
                  <select
                    value={outputLanguage}
                    onChange={(e) => setOutputLanguage(e.target.value as Language)}
                    className="w-full text-xs font-medium h-9 rounded-md border border-border bg-background px-2.5 text-foreground cursor-pointer"
                  >
                    <option value="en">English (US/UK) 🇺🇸</option>
                    <option value="ar">العربية (Arabic) 🇹🇳</option>
                  </select>
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Generate Button */}
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-6 font-bold text-sm bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 hover:opacity-95 text-white shadow-lg shadow-indigo-500/25 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RotateCw className="size-4 animate-spin" />
                    <span>{t.studio.generatingBtn}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-4" />
                    <span>{t.studio.generateBtn}</span>
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Output Display Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!result && !loading && (
            <Card className="border-dashed border-2 border-border/80 bg-muted/10 p-12 text-center min-h-[500px] flex flex-col items-center justify-center">
              <div className="size-16 rounded-2xl bg-gradient-to-tr from-violet-500/20 to-pink-500/20 text-primary flex items-center justify-center mb-4">
                <Sparkles className="size-8 text-violet-500" />
              </div>
              <h3 className="text-lg font-bold">Studio Canvas is Ready</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1.5 leading-relaxed">
                Choose your platform, type your topic, and generate algorithmically structured titles, hooks, and scripts.
              </p>
            </Card>
          )}

          {loading && (
            <Card className="border-border bg-card p-10 min-h-[500px] flex flex-col items-center justify-center text-center space-y-4">
              <div className="size-14 rounded-full border-4 border-violet-500/20 border-t-violet-600 animate-spin" />
              <div className="space-y-1">
                <h3 className="text-base font-bold">
                  Structuring {platform.toUpperCase()} Output...
                </h3>
                <p className="text-xs text-muted-foreground">
                  Synthesizing viral hooks, SEO keywords, and retention architecture
                </p>
              </div>
            </Card>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Output Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize text-xs font-bold">
                    {result.platform} {"contentType" in result ? `· ${result.contentType}` : ""}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Language: {outputLanguage.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    className="text-xs h-8 cursor-pointer gap-1.5"
                  >
                    <RotateCw className="size-3.5" />
                    <span>{t.studio.regenerate}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSaveToLibrary}
                    className="text-xs h-8 cursor-pointer gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {savedSuccess ? (
                      <>
                        <Check className="size-3.5" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="size-3.5" />
                        <span>{t.studio.saveToLibrary}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* YOUTUBE OUTPUT RENDER */}
              {result.platform === "youtube" && (
                <div className="space-y-4">
                  {/* Titles */}
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Flame className="size-3.5 text-amber-500" />
                          <span>{t.studio.titles}</span>
                        </span>
                      </div>
                      <div className="space-y-2">
                        {result.content.titles.map((title: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition border border-border/50 text-sm font-semibold"
                          >
                            <span className="line-clamp-2">{title}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(title, `title-${idx}`)}
                              className="size-7 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                              {copiedKey === `title-${idx}` ? (
                                <Check className="size-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Opening Hook */}
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {t.studio.hooks} (First 10s)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.content.openingHook, "hook")}
                          className="h-7 text-xs cursor-pointer gap-1"
                        >
                          {copiedKey === "hook" ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          <span>Copy</span>
                        </Button>
                      </div>
                      <p className="text-sm bg-muted/40 p-3 rounded-lg border border-border/50 leading-relaxed font-medium">
                        {result.content.openingHook}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Description */}
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {t.studio.description}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.content.description, "desc")}
                          className="h-7 text-xs cursor-pointer gap-1"
                        >
                          {copiedKey === "desc" ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          <span>Copy</span>
                        </Button>
                      </div>
                      <pre className="text-xs bg-muted/40 p-3 rounded-lg border border-border/50 font-sans whitespace-pre-wrap leading-relaxed text-foreground/90">
                        {result.content.description}
                      </pre>
                    </CardContent>
                  </Card>

                  {/* Tags & Hashtags */}
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        SEO Tags & Hashtags
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {result.content.hashtags?.map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            onClick={() => handleCopy(tag, tag)}
                            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TIKTOK OUTPUT RENDER */}
              {result.platform === "tiktok" && (
                <div className="space-y-4">
                  {/* Hook */}
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Flame className="size-3.5 text-pink-500" />
                          <span>{t.studio.hooks} (0-2s)</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.content.openingHook, "tt-hook")}
                          className="h-7 text-xs cursor-pointer gap-1"
                        >
                          {copiedKey === "tt-hook" ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          <span>Copy</span>
                        </Button>
                      </div>
                      <p className="text-sm font-semibold bg-muted/40 p-3 rounded-lg border border-border/50">
                        {result.content.openingHook}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Full Script */}
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {t.studio.script}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.content.script, "tt-script")}
                          className="h-7 text-xs cursor-pointer gap-1"
                        >
                          {copiedKey === "tt-script" ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          <span>Copy Script</span>
                        </Button>
                      </div>
                      <pre className="text-xs bg-muted/40 p-3.5 rounded-lg border border-border/50 font-sans whitespace-pre-wrap leading-relaxed">
                        {result.content.script}
                      </pre>
                    </CardContent>
                  </Card>

                  {/* Caption & Hashtags */}
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {t.studio.caption} & {t.studio.hashtags}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(
                              `${result.content.caption}\n\n${result.content.hashtags?.join(" ")}`,
                              "tt-caption"
                            )
                          }
                          className="h-7 text-xs cursor-pointer gap-1"
                        >
                          {copiedKey === "tt-caption" ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          <span>Copy</span>
                        </Button>
                      </div>
                      <p className="text-xs bg-muted/40 p-3 rounded-lg border border-border/50 leading-relaxed">
                        {result.content.caption}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {result.content.hashtags?.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* INSTAGRAM CAROUSEL RENDER */}
              {result.platform === "instagram" && result.contentType === "carousel" && (
                <div className="space-y-4">
                  {/* Interactive Carousel Preview */}
                  <Card className="border-border bg-card overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Layers className="size-3.5 text-violet-500" />
                          <span>
                            Slide {currentSlideIndex + 1} of{" "}
                            {result.content.slides?.length}
                          </span>
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={currentSlideIndex === 0}
                            onClick={() =>
                              setCurrentSlideIndex((prev) => Math.max(0, prev - 1))
                            }
                            className="size-7 cursor-pointer"
                          >
                            <ChevronLeft className="size-3.5 rtl:rotate-180" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={
                              currentSlideIndex ===
                              (result.content.slides?.length ?? 1) - 1
                            }
                            onClick={() =>
                              setCurrentSlideIndex((prev) =>
                                Math.min(
                                  (result.content.slides?.length ?? 1) - 1,
                                  prev + 1
                                )
                              )
                            }
                            className="size-7 cursor-pointer"
                          >
                            <ChevronRight className="size-3.5 rtl:rotate-180" />
                          </Button>
                        </div>
                      </div>

                      {/* Visual Slide Card Preview */}
                      {result.content.slides?.[currentSlideIndex] && (
                        <div className="aspect-[4/5] max-h-80 w-full max-w-sm mx-auto rounded-2xl p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 text-white flex flex-col justify-between shadow-xl border border-white/10">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>@{niche.toLowerCase().replace(/\s+/g, "")}</span>
                            <span>
                              {currentSlideIndex + 1}/
                              {result.content.slides.length}
                            </span>
                          </div>

                          <div className="space-y-3 my-auto">
                            <h4 className="text-lg sm:text-xl font-extrabold leading-snug">
                              {result.content.slides[currentSlideIndex].heading}
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                              {result.content.slides[currentSlideIndex].body}
                            </p>
                          </div>

                          <div className="text-[10px] text-center text-slate-400 tracking-wider uppercase">
                            Swipe for next ➡️
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Caption & Hashtags */}
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {t.studio.caption}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(
                              `${result.content.caption}\n\n${result.content.hashtags?.join(" ")}`,
                              "ig-caption"
                            )
                          }
                          className="h-7 text-xs cursor-pointer gap-1"
                        >
                          {copiedKey === "ig-caption" ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          <span>Copy Caption</span>
                        </Button>
                      </div>
                      <p className="text-xs bg-muted/40 p-3 rounded-lg border border-border/50 leading-relaxed">
                        {result.content.caption}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {result.content.hashtags?.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* INSTAGRAM REEL RENDER */}
              {result.platform === "instagram" && result.contentType === "reel" && (
                <div className="space-y-4">
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Flame className="size-3.5 text-pink-500" />
                          <span>{t.studio.hooks}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.content.openingHook, "reel-hook")}
                          className="h-7 text-xs cursor-pointer gap-1"
                        >
                          {copiedKey === "reel-hook" ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          <span>Copy</span>
                        </Button>
                      </div>
                      <p className="text-sm font-semibold bg-muted/40 p-3 rounded-lg border border-border/50">
                        {result.content.openingHook}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border bg-card">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {t.studio.script}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(result.content.script, "reel-script")}
                          className="h-7 text-xs cursor-pointer gap-1"
                        >
                          {copiedKey === "reel-script" ? (
                            <Check className="size-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          <span>Copy</span>
                        </Button>
                      </div>
                      <pre className="text-xs bg-muted/40 p-3.5 rounded-lg border border-border/50 font-sans whitespace-pre-wrap leading-relaxed">
                        {result.content.script}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIStudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading Studio...</div>}>
      <AIStudioContent />
    </Suspense>
  );
}
