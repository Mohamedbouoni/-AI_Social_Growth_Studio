"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Search,
  Filter,
  Plus,
  Copy,
  Check,
  MoreVertical,
  ExternalLink,
  Trash2,
  Bookmark,
  Calendar,
} from "lucide-react";
import { YouTubeIcon, TikTokIcon, InstagramIcon } from "@/components/icons";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectItem {
  id: string;
  title: string;
  niche: string;
  platform: "youtube" | "tiktok" | "instagram";
  contentType: string;
  status: "draft" | "planned" | "published";
  createdAt: string;
  idea: string;
}

export default function LibraryPage() {
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectItem[]>([
    {
      id: "p1",
      title: "5 Micro-Habits That Doubled My Deep Work in 2026",
      niche: "Productivity & Tech",
      platform: "youtube",
      contentType: "video",
      status: "draft",
      createdAt: "Oct 19, 2026",
      idea: "How small daily habits compound into massive creative output.",
    },
    {
      id: "p2",
      title: "Why 90% of Creators Fail on TikTok Within 30 Days",
      niche: "Content Strategy",
      platform: "tiktok",
      contentType: "short",
      status: "planned",
      createdAt: "Oct 18, 2026",
      idea: "The psychological trap of inconsistency and poor 2-second hooks.",
    },
    {
      id: "p3",
      title: "The Zero-Dollar Solo SaaS Tech Stack Breakdown",
      niche: "SaaS & Coding",
      platform: "instagram",
      contentType: "carousel",
      status: "published",
      createdAt: "Oct 15, 2026",
      idea: "Full guide using Next.js, Supabase free tier, and Ollama.",
    },
    {
      id: "p4",
      title: "10 AI Prompts That Feel Illegal for Instagram Reels",
      niche: "AI Tools",
      platform: "instagram",
      contentType: "reel",
      status: "draft",
      createdAt: "Oct 14, 2026",
      idea: "High-retention prompts for fast video creation.",
    },
    {
      id: "p5",
      title: "How I Built an Audience from Zero Without Paid Ads",
      niche: "Personal Branding",
      platform: "youtube",
      contentType: "video",
      status: "planned",
      createdAt: "Oct 12, 2026",
      idea: "Organic distribution framework for modern founders.",
    },
  ]);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.niche.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform =
      selectedPlatform === "all" || p.platform === selectedPlatform;
    const matchesStatus =
      selectedStatus === "all" || p.status === selectedStatus;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "youtube":
        return <YouTubeIcon className="size-4" />;
      case "tiktok":
        return <TikTokIcon className="size-4" />;
      case "instagram":
        return <InstagramIcon className="size-4" />;
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
            {t.nav.library}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, organize, edit, and repurpose your saved content drafts
          </p>
        </div>

        <Link href="/dashboard/studio">
          <Button className="bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 hover:opacity-95 text-white font-semibold cursor-pointer">
            <Plus className="size-4 mr-2" />
            <span>Create Draft</span>
          </Button>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, topic, or niche..."
            className="ps-9 h-10 text-sm"
          />
        </div>

        {/* Platform filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Platforms" },
            { id: "youtube", label: "YouTube" },
            { id: "tiktok", label: "TikTok" },
            { id: "instagram", label: "Instagram" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedPlatform(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedPlatform === item.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-3">
        {filteredProjects.length === 0 ? (
          <Card className="border-dashed border-2 border-border p-12 text-center">
            <FolderOpen className="size-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-bold">No content projects found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search terms or generate new content in AI Studio.
            </p>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition"
            >
              <div className="flex items-start gap-3.5">
                <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  {getPlatformIcon(project.platform)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold hover:text-primary cursor-pointer line-clamp-1">
                      {project.title}
                    </h3>
                    <Badge
                      variant={
                        project.status === "published"
                          ? "default"
                          : project.status === "planned"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] capitalize font-medium"
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {project.niche}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{project.contentType}</span>
                    <span>•</span>
                    <span>{project.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(project.id, project.title)}
                  className="h-8 text-xs cursor-pointer gap-1.5"
                >
                  {copiedId === project.id ? (
                    <>
                      <Check className="size-3 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>

                <Link
                  href={`/dashboard/studio?platform=${project.platform}&idea=${encodeURIComponent(
                    project.title
                  )}`}
                >
                  <Button
                    size="sm"
                    className="h-8 text-xs cursor-pointer bg-primary text-primary-foreground"
                  >
                    Open in Studio
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger className="size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer">
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 p-1">
                    <DropdownMenuItem
                      onClick={() => handleDelete(project.id)}
                      className="flex items-center gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete draft</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
