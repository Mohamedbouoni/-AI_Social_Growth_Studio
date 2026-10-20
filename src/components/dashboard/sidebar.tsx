"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  LayoutDashboard,
  Wand2,
  FolderOpen,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  Globe,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function DashboardSidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language, toggleLanguage, dir } = useLanguage();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    {
      label: t.nav.overview,
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      label: t.nav.studio,
      href: "/dashboard/studio",
      icon: Wand2,
      badge: "AI",
      active: pathname.startsWith("/dashboard/studio"),
    },
    {
      label: t.nav.library,
      href: "/dashboard/library",
      icon: FolderOpen,
      active: pathname.startsWith("/dashboard/library"),
    },
    {
      label: t.nav.calendar,
      href: "/dashboard/calendar",
      icon: CalendarDays,
      active: pathname.startsWith("/dashboard/calendar"),
    },
    {
      label: t.nav.analytics,
      href: "/dashboard/analytics",
      icon: BarChart3,
      active: pathname.startsWith("/dashboard/analytics"),
    },
    {
      label: t.nav.settings,
      href: "/dashboard/settings",
      icon: Settings,
      active: pathname.startsWith("/dashboard/settings"),
    },
  ];

  return (
    <aside className="w-64 h-full flex flex-col justify-between border-r border-border bg-card/60 backdrop-blur-xl">
      {/* Top section: Brand */}
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 font-bold text-base tracking-tight hover:opacity-90 transition"
          >
            <div className="size-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="size-4" />
            </div>
            <span className="truncate">{t.brand}</span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            title={language === "en" ? "تبديل إلى العربية" : "Switch to English"}
          >
            <Globe className="size-4" />
          </Button>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant={item.active ? "secondary" : "default"}
                    className="text-[10px] uppercase font-bold py-0 h-4 bg-gradient-to-r from-violet-500 to-pink-500 text-white"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: Usage card, upgrade & logout */}
      <div className="p-4 space-y-3">
        {/* Usage Card */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-background/80 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-foreground">
              <Zap className="size-3.5 text-amber-500 fill-amber-500" />
              <span>{t.common.freePlan}</span>
            </span>
            <span className="text-muted-foreground font-mono">7 / 10 used</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              style={{ width: "70%" }}
            />
          </div>

          <Link href="/dashboard/settings?tab=subscription">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold h-7 border-border hover:border-primary/50 text-foreground cursor-pointer"
            >
              {t.common.upgrade}
            </Button>
          </Link>
        </div>

        <Separator />

        {/* Logout action */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
        >
          <LogOut className="size-4 shrink-0" />
          <span>{t.nav.logout}</span>
        </button>
      </div>
    </aside>
  );
}
