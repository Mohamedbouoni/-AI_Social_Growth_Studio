"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Globe, ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, language, toggleLanguage, dir } = useLanguage();

  return (
    <div className="min-h-screen w-full flex flex-col lg:grid lg:grid-cols-2">
      {/* Left side (Form panel) */}
      <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10 bg-background">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-80 transition"
          >
            <div className="size-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="size-5" />
            </div>
            <span>{t.brand}</span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
          >
            <Globe className="size-4" />
            <span>{language === "en" ? "العربية (AR)" : "English (EN)"}</span>
          </Button>
        </div>

        <div className="w-full max-w-md mx-auto my-auto py-10">
          {children}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-6 border-t">
          <span>© 2026 {t.brand}. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:underline">
              Terms
            </Link>
          </div>
        </div>
      </div>

      {/* Right side (Brand showcase panel) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-pink-600/20 blur-3xl" />

        <div className="relative z-10 flex justify-end">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition"
          >
            {dir === "rtl" ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
            <span>Back to website</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg my-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/10 backdrop-blur border border-white/10 text-pink-300">
            <Sparkles className="size-3.5" />
            <span>Next-Gen Creator Suite</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
            {language === "ar"
              ? "ضاعف نمو قنواتك ومتابعيك باستخدام الذكاء الاصطناعي المصمم للمبدعين"
              : "Amplify your reach with AI structured specifically for each platform."}
          </h1>

          <p className="text-slate-300 text-base leading-relaxed">
            {language === "ar"
              ? "حوّل فكرة واحدة إلى سيناريوهات يوتيوب كاملة، وفيديوهات تيك توك فيروسية، وبوستات إنستغرام مخصصة خلال ثوانٍ معدودة."
              : "Transform one core idea into high-retention YouTube scripts, viral TikTok hooks, and conversion-ready Instagram carousels in seconds."}
          </p>

          {/* Social Proof badges */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white">3.4x</div>
              <div className="text-xs text-slate-400">Avg. Hook Retention</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white">10M+</div>
              <div className="text-xs text-slate-400">Words Generated</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-white">3 in 1</div>
              <div className="text-xs text-slate-400">YT · TT · IG</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
          <span>Open-source architecture · PostgreSQL & Supabase</span>
          <span>Tunisia 🇹🇳 & Global</span>
        </div>
      </div>
    </div>
  );
}
