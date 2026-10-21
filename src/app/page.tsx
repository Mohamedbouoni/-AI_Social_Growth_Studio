"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlanCards } from "@/components/billing/plan-cards";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  Globe,
  TrendingUp,
  FolderOpen,
  Shield,
  Layers,
  ChevronRight,
} from "lucide-react";
import { YouTubeIcon, TikTokIcon, InstagramIcon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  const { t, language, toggleLanguage, dir } = useLanguage();
  const router = useRouter();
  const [activeDemoPlatform, setActiveDemoPlatform] = useState<
    "youtube" | "tiktok" | "instagram"
  >("youtube");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-sage-soft selection:text-foreground">
      {/* Top Navbar */}
      <header className="h-16 border-b border-border/70 sticky top-0 z-50 bg-background/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="font-extrabold text-base tracking-tight">
            {t.brand}
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">
            Features
          </a>
          <a href="#demo" className="hover:text-foreground transition">
            Interactive Demo
          </a>
          <a href="#pricing" className="hover:text-foreground transition">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-xs font-medium gap-1.5 cursor-pointer"
          >
            <Globe className="size-3.5" />
            <span>{language === "en" ? "العربية" : "English"}</span>
          </Button>

          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs cursor-pointer">
              {t.nav.login}
            </Button>
          </Link>

          <Link href="/register">
            <Button
              size="sm"
              className="bg-primary hover:opacity-90 text-primary-foreground font-semibold text-xs cursor-pointer"
            >
              {t.nav.getStarted}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto space-y-8">
        {/* Glow background */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 size-96 rounded-full bg-sage/15 blur-3xl pointer-events-none" />
        <div className="absolute top-24 left-1/3 size-72 rounded-full bg-sage-soft/40 blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-muted/80 border border-border text-foreground shadow-sm">
          <Sparkles className="size-3.5 text-sage" />
          <span>YouTube · TikTok · Instagram Multi-Platform SaaS</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15]">
          {language === "ar" ? (
            <>
              حوّل فكرتك إلى محتوى فيروسي <br />
              <span className="text-sage">
                مخصص لكل خوارزمية تواصل
              </span>
            </>
          ) : (
            <>
              One core idea. Three platforms. <br />
              <span className="text-sage">
                Engineered for maximum reach.
              </span>
            </>
          )}
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t.tagline}. Generate high-converting hooks, SEO video descriptions,
          viral scripts, and multi-slide carousels in seconds.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/register">
            <Button
              size="lg"
              className="w-full sm:w-auto px-8 py-6 text-sm font-bold bg-primary hover:opacity-95 text-primary-foreground cursor-pointer"
            >
              <span>Start Free (10 Credits / mo)</span>
              <ArrowRight className="size-4 ml-2 rtl:rotate-180" />
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-8 py-6 text-sm font-semibold border-border hover:bg-muted cursor-pointer"
            >
              Explore Live Demo
            </Button>
          </Link>
        </div>

        {/* Social Proof feature line */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Open-source architecture</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>PostgreSQL & RLS tenant security</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Native English & Arabic with RTL</span>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            See the Structured Output in Action
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Pick a platform to preview how our structured generation models tailor content format
          </p>
        </div>

        {/* Platform Selector Buttons */}
        <div className="flex justify-center gap-2">
          {[
            { id: "youtube", label: "YouTube Studio", icon: YouTubeIcon },
            { id: "tiktok", label: "TikTok Viral Engine", icon: TikTokIcon },
            { id: "instagram", label: "Instagram Carousels", icon: InstagramIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = activeDemoPlatform === item.id;
            return (
              <button
                key={item.id}
                onClick={() =>
                  setActiveDemoPlatform(
                    item.id as "youtube" | "tiktok" | "instagram"
                  )
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Demo Preview Box */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
          {activeDemoPlatform === "youtube" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[10px] font-bold uppercase text-amber-500 tracking-wider">
                  Top Click-Through Titles
                </span>
                <p className="text-sm font-bold mt-1">
                  1. The 5 Micro-Habits That Doubled My Deep Work in 2026
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  2. Why 95% of Creators Never Finish Their First SaaS (And How to Fix It)
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[10px] font-bold uppercase text-sage tracking-wider">
                  10-Second Retention Hook
                </span>
                <p className="text-xs font-medium mt-1 leading-relaxed">
                  &ldquo;If you think succeeding as a solo creator takes years of trial and error, you&apos;re about to see the exact blueprint that helped me scale from 0 to 100k without paid ads...&rdquo;
                </p>
              </div>
            </div>
          )}

          {activeDemoPlatform === "tiktok" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[10px] font-bold uppercase text-sage tracking-wider">
                  2-Second Pattern Disruptor
                </span>
                <p className="text-sm font-bold mt-1">
                  &ldquo;Stop scrolling. If you still post on TikTok without this 3-part formula, you&apos;re wasting 80% of your views...&rdquo;
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[10px] font-bold uppercase text-cyan-500 tracking-wider">
                  High-Retention Beat Sheet
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  [0-2s] Pattern Interrupt ➡️ [2-10s] The Critical Mistake ➡️ [10-25s] 3-Step Fix ➡️ [25-30s] Loop CTA
                </p>
              </div>
            </div>
          )}

          {activeDemoPlatform === "instagram" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-[10px] font-bold uppercase text-sage tracking-wider">
                  5-Slide Carousel Playbook
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
                  <div className="p-2.5 rounded bg-background border text-xs space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Slide 1</span>
                    <p className="font-bold">Bold Hook Title</p>
                  </div>
                  <div className="p-2.5 rounded bg-background border text-xs space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Slide 2-4</span>
                    <p className="font-bold">1 Insight Per Slide</p>
                  </div>
                  <div className="p-2.5 rounded bg-background border text-xs space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Slide 5</span>
                    <p className="font-bold">Save & Share CTA</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Built for Solo Creators & Growth Teams
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            A modular monolith designed to start cheap on free tiers and scale seamlessly
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-3">
              <div className="size-10 rounded-xl bg-sage-softer text-sage flex items-center justify-center">
                <Sparkles className="size-5" />
              </div>
              <h3 className="text-base font-bold">Platform-Specific Schemas</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No generic AI fluff. YouTube descriptions aren&apos;t treated like Instagram reels. Every output conforms to strict platform rules.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-3">
              <div className="size-10 rounded-xl bg-sage-softer text-sage flex items-center justify-center">
                <Layers className="size-5" />
              </div>
              <h3 className="text-base font-bold">1-Click Repurposing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Turn a YouTube video outline into 3 TikTok short scripts and a 7-slide Instagram carousel without re-entering your idea.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-3">
              <div className="size-10 rounded-xl bg-sage-softer text-sage flex items-center justify-center">
                <TrendingUp className="size-5" />
              </div>
              <h3 className="text-base font-bold">Growth Coach Insights</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evidence-based experiments tailored to your data. Find out which hook formulations deliver higher watch-time.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section — TND plans, paid locally through Konnect */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t.app.landingPricingTitle}</h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">{t.app.landingPricingBody}</p>
        </div>

        <PlanCards onChoose={(plan) => router.push(`/register?plan=${plan}`)} />

        <div className="flex flex-col items-center gap-4">
          <Link
            href="/register"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t.app.landingFreeCta}
          </Link>
          <ul className="flex flex-wrap justify-center gap-2" aria-label={t.app.paymentMethods}>
            {["Konnect", t.app.payBankCard, "e-Dinar", "Flouci"].map((method) => (
              <li key={method} className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-card">
                {method}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8 px-4 sm:px-8 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>© 2026 {t.brand}. Designed for high-impact creators.</span>
        </div>
        <div className="flex gap-4">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/login" className="hover:underline">
            Sign In
          </Link>
          <Link href="/register" className="hover:underline">
            Sign Up
          </Link>
        </div>
      </footer>
    </div>
  );
}
