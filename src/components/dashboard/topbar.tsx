"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Sparkles,
  Globe,
  LogOut,
  User,
  Settings,
  Bell,
  Search,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export function DashboardTopbar({ onOpenMobileMenu }: TopbarProps) {
  const router = useRouter();
  const { t, language, toggleLanguage } = useLanguage();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string>("creator@example.com");
  const [userName, setUserName] = useState<string>("Creator");

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? "creator@example.com");
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Creator";
        setUserName(name);
      }
    }
    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile menu toggle & quick search */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileMenu}
          className="lg:hidden size-9 rounded-lg"
          aria-label="Open sidebar"
        >
          <Menu className="size-5" />
        </Button>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-background/60 text-xs text-muted-foreground w-64">
          <Search className="size-3.5" />
          <span>Quick search or jump to...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Quick Studio CTA + Language + Notifications + Avatar */}
      <div className="flex items-center gap-2.5">
        <Link href="/dashboard/studio">
          <Button
            size="sm"
            className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 hover:opacity-90 text-white font-medium text-xs px-3.5 py-2 shadow-sm shadow-indigo-500/20 cursor-pointer"
          >
            <Sparkles className="size-3.5" />
            <span>{t.dashboard.quickAction}</span>
          </Button>
        </Link>

        {/* Language switch */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="text-xs font-medium gap-1.5 px-2.5 cursor-pointer"
        >
          <Globe className="size-3.5" />
          <span>{language === "en" ? "العربية" : "English"}</span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-pink-500" />
        </Button>

        {/* User profile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative size-9 rounded-full p-0 flex items-center justify-center outline-none cursor-pointer">
            <Avatar className="size-8 border border-border">
              <AvatarFallback className="bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-xs font-bold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5">
            <DropdownMenuLabel className="font-normal px-2 py-1.5">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
              className="flex items-center gap-2 text-xs py-2 cursor-pointer"
            >
              <User className="size-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings?tab=subscription")}
              className="flex items-center gap-2 text-xs py-2 cursor-pointer"
            >
              <Settings className="size-4" />
              <span>Billing & Subscription</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs py-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="size-4" />
              <span>{t.nav.logout}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
