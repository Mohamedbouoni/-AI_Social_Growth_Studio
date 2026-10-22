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

export interface Payment {
  id: string;
  workspace_id: string;
  plan: PaidPlan;
  amount_millimes: number;
  provider: string;
  provider_payment_ref: string | null;
  pay_url: string | null;
  status: "pending" | "completed" | "failed" | "expired";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Plans — credits per billing cycle, TND prices and feature gates
// ---------------------------------------------------------------------------
// Free credits reset each calendar month. Paid plans are prepaid 30-day
// passes (Konnect has no recurring billing).

export type PaidPlan = Exclude<Plan, "free">;
export type UsageKind = "generation" | "repurpose" | "assistant" | "video";

export interface PlanConfig {
  credits: number;
  /** Price in millimes (1 TND = 1000 millimes); 0 for free. */
  priceMillimes: number;
  /** Longest video the Video Studio accepts on this plan. */
  maxVideoSeconds: number;
  features: {
    allTones: boolean;
    qualityModel: boolean;
    repurpose: boolean;
    exportLibrary: boolean;
  };
}

export const PLAN_DURATION_DAYS = 30;

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    credits: 10,
    priceMillimes: 0,
    maxVideoSeconds: 300,
    features: { allTones: false, qualityModel: false, repurpose: false, exportLibrary: false },
  },
  creator: {
    credits: 150,
    priceMillimes: 19000,
    maxVideoSeconds: 1800,
    features: { allTones: true, qualityModel: true, repurpose: true, exportLibrary: false },
  },
  growth: {
    credits: 600,
    priceMillimes: 49000,
    maxVideoSeconds: 1800,
    features: { allTones: true, qualityModel: true, repurpose: true, exportLibrary: true },
  },
};

/** Tones available on the free plan; the rest unlock with a paid plan. */
export const FREE_TONES = ["professional", "casual", "educational", "inspirational"] as const;

/** Credits each action costs. */
export const CREDIT_COST: Record<UsageKind, number> = {
  generation: 1,
  repurpose: 3,
  assistant: 1,
  video: 5,
};

export function isPaidPlan(plan: string): plan is PaidPlan {
  return plan === "creator" || plan === "growth";
}
