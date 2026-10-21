"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  User,
  Settings,
  CreditCard,
  Shield,
  Link2,
  Check,
  ExternalLink,
  Sparkles,
  Zap,
  Globe,
  AlertCircle,
} from "lucide-react";
import { YouTubeIcon, TikTokIcon, InstagramIcon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { fmt, formatDate } from "@/lib/i18n/format";
import { useSessionProfile, useUsage } from "@/lib/queries/hooks";
import { planLabel } from "@/components/billing/plan-cards";
import { RingGauge } from "@/components/dashboard/ring-gauge";

function SubscriptionSummary() {
  const { t, language } = useLanguage();
  const { data: usage } = useUsage();
  if (!usage) return <div className="h-32 animate-pulse rounded-xl bg-card shadow-card" />;
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-card p-6 shadow-card sm:flex-row sm:items-center">
      <RingGauge value={(usage.credits.used / Math.max(1, usage.credits.limit)) * 100} caption={t.app.creditsUsed} aria-label={t.app.creditUsage} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm text-muted-foreground">{t.app.yourPlan}</p>
        <p className="text-xl font-bold">{planLabel(usage.plan, t)}</p>
        <p className="text-sm text-muted-foreground">
          {usage.passEnd
            ? fmt(t.app.activeUntil, { date: formatDate(usage.passEnd, language) })
            : fmt(t.app.resetsOn, { date: formatDate(usage.cycle.end, language) })}
        </p>
      </div>
      <Link href="/dashboard/billing" className="rounded-full bg-primary px-5 py-2.5 text-center text-sm font-semibold text-primary-foreground">
        {usage.plan === "free" ? t.app.seePlans : t.shell.billing}
      </Link>
    </div>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";

  const { t, language, setLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState(initialTab);
  const { data: profile } = useSessionProfile();
  const [displayNameDraft, setDisplayName] = useState<string | null>(null);
  const displayName = displayNameDraft ?? profile?.name ?? "";
  const email = profile?.email ?? "";
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Social account connection states
  const [connections, setConnections] = useState({
    youtube: false,
    tiktok: false,
    instagram: false,
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const toggleConnection = (platform: "youtube" | "tiktok" | "instagram") => {
    setConnections((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t.nav.settings}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account profile, social integrations, and subscription plan
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="profile" className="text-xs font-semibold gap-2">
            <User className="size-3.5" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="text-xs font-semibold gap-2">
            <Link2 className="size-3.5" />
            <span>Connected Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="text-xs font-semibold gap-2">
            <CreditCard className="size-3.5" />
            <span>Subscription & Plan</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs font-semibold gap-2">
            <Shield className="size-3.5" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Personal Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="displayName">{t.auth.fullNameLabel}</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t.auth.emailLabel}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="text-sm bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed directly. Contact support if needed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Application Language</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={language === "en" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLanguage("en")}
                      className="cursor-pointer"
                    >
                      English 🇺🇸
                    </Button>
                    <Button
                      type="button"
                      variant={language === "ar" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLanguage("ar")}
                      className="cursor-pointer"
                    >
                      العربية (Arabic) 🇹🇳
                    </Button>
                  </div>
                </div>

                {savedSuccess && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    <Check className="size-4" />
                    <span>Profile settings saved successfully!</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground font-semibold cursor-pointer"
                >
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Connected Accounts Tab */}
        <TabsContent value="connections" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Social Platform Integrations
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Connect your YouTube, TikTok, and Instagram accounts for official analytics and direct posting.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* YouTube */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
                    <YouTubeIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">YouTube Channel</h3>
                    <p className="text-xs text-muted-foreground">
                      Access to YouTube Data API & Analytics
                    </p>
                  </div>
                </div>

                <Button
                  variant={connections.youtube ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleConnection("youtube")}
                  className="text-xs cursor-pointer"
                >
                  {connections.youtube ? "Disconnect" : "Connect Channel"}
                </Button>
              </div>

              {/* TikTok */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
                    <TikTokIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">TikTok Account</h3>
                    <p className="text-xs text-muted-foreground">
                      Login Kit & Content Posting API
                    </p>
                  </div>
                </div>

                <Button
                  variant={connections.tiktok ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleConnection("tiktok")}
                  className="text-xs cursor-pointer"
                >
                  {connections.tiktok ? "Disconnect" : "Connect TikTok"}
                </Button>
              </div>

              {/* Instagram */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-3.5">
                  <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
                    <InstagramIcon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Instagram Professional</h3>
                    <p className="text-xs text-muted-foreground">
                      Meta Graph API & Insights
                    </p>
                  </div>
                </div>

                <Button
                  variant={connections.instagram ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleConnection("instagram")}
                  className="text-xs cursor-pointer"
                >
                  {connections.instagram ? "Disconnect" : "Connect Instagram"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Subscription & Plan Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Plans and payments live on the Billing page (Konnect checkout) */}
          <SubscriptionSummary />
        </TabsContent>

        {/* 4. Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold">Account Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" placeholder="••••••••" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" placeholder="••••••••" />
              </div>

              <Button className="bg-primary text-primary-foreground text-xs font-semibold cursor-pointer">
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading Settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
