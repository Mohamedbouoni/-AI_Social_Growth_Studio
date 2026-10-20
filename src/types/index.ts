// =============================================================================
// Shared TypeScript Types
// =============================================================================
// Database row types and shared application types.
// These mirror the database schema for type-safe access.
// =============================================================================

export type Plan = "free" | "creator" | "growth";

export type WorkspaceRole = "owner" | "editor" | "viewer";

export type ProjectStatus = "draft" | "planned" | "published" | "archived";

export type SocialPlatform = "youtube" | "tiktok" | "instagram";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "paused"
  | "trialing";

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  language: "en" | "ar";
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  plan: Plan;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
}

export interface ContentProject {
  id: string;
  workspace_id: string;
  title: string;
  niche: string;
  language: "en" | "ar";
  source_idea: string;
  tone: string;
  status: ProjectStatus;
  planned_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentVariant {
  id: string;
  project_id: string;
  platform: SocialPlatform;
  content_type: string;
  output_json: Record<string, unknown>;
  version: number;
  created_at: string;
}

export interface SocialConnection {
  id: string;
  workspace_id: string;
  platform: SocialPlatform;
  platform_user_id: string;
  platform_username: string | null;
  platform_display_name: string | null;
  platform_avatar_url: string | null;
  token_expires_at: string | null;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export interface GenerationUsageRow {
  id: string;
  workspace_id: string;
  request_id: string;
  model: string;
  platform: string;
  content_type: string;
  tokens_in: number;
  tokens_out: number;
  credits_used: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  workspace_id: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  status: SubscriptionStatus;
  plan: Plan;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Plan limits — generation credits per billing period
// ---------------------------------------------------------------------------

export const PLAN_LIMITS: Record<Plan, { generationsPerMonth: number }> = {
  free: { generationsPerMonth: 10 },
  creator: { generationsPerMonth: 100 },
  growth: { generationsPerMonth: 500 },
};
