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

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";

  const { t, language, setLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [displayName, setDisplayName] = useState("Mohamed Bouoni");
  const [email, setEmail] = useState("mohamed.bouoni@horizon-tech.tn");
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Free Plan */}
            <Card className="border-border bg-card relative">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-xs">
                    Current Plan
                  </Badge>
                  <h3 className="text-lg font-bold">Free Creator</h3>
                  <div className="text-2xl font-extrabold">€0</div>
                </div>

                <ul className="text-xs space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>10 AI generations / month</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>YouTube, TikTok & Instagram schemas</span>
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>English & Arabic output</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>Basic library & calendar</span>
                  </li>
                </ul>

                <Button
                  disabled
                  variant="outline"
                  className="w-full text-xs font-semibold cursor-not-allowed"
                >
                  Active
                </Button>
              </CardContent>
            </Card>

            {/* Creator Plan */}
            <Card className="border-violet-500/50 bg-gradient-to-b from-violet-500/5 to-transparent relative shadow-md">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-[10px] uppercase">
                  Most Popular
                </Badge>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Creator</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold">€9</span>
                    <span className="text-xs text-muted-foreground">/month</span>
                  </div>
                </div>

                <ul className="text-xs space-y-2 text-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>100 AI generations / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>All 3 platforms supported</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>Viral Hooks & Carousel Slides</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>Unlimited saved drafts</span>
                  </li>
                </ul>

                <Button className="w-full text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 text-white cursor-pointer shadow-md shadow-indigo-500/20">
                  Upgrade to Creator
                </Button>
              </CardContent>
            </Card>

            {/* Growth Plan */}
            <Card className="border-border bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Growth</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold">€19</span>
                    <span className="text-xs text-muted-foreground">/month</span>
                  </div>
                </div>

                <ul className="text-xs space-y-2 text-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>500 AI generations / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>Priority model inference</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>Advanced Growth Coach</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    <span>Multi-channel auto-repurposing</span>
                  </li>
                </ul>

                <Button variant="outline" className="w-full text-xs font-semibold cursor-pointer">
                  Upgrade to Growth
                </Button>
              </CardContent>
            </Card>
          </div>
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
