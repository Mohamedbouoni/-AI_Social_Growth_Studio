"use client";

// =============================================================================
// React Query hooks for dashboard data
// =============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GeneratedContent } from "@/modules/ai/schemas";
import type { Plan, PlanConfig, ProjectStatus, SocialPlatform, UsageKind } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "./client";

// ---------------------------------------------------------------------------
// Types returned by the API routes
// ---------------------------------------------------------------------------

export interface UsageSummary {
  plan: Plan;
  credits: { used: number; limit: number; remaining: number };
  creditCost: Record<UsageKind, number>;
  cycle: { start: string; end: string };
  passEnd: string | null;
  features: PlanConfig["features"];
}

export interface LibraryVariant {
  id: string;
  platform: SocialPlatform;
  content_type: string;
  output_json: GeneratedContent;
  version: number;
  created_at: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  niche: string;
  language: "en" | "ar";
  source_idea: string;
  tone: string;
  status: ProjectStatus;
  planned_date: string | null;
  created_at: string;
  updated_at: string;
  content_variants: LibraryVariant[];
}

export interface PaymentRow {
  id: string;
  plan: Exclude<Plan, "free">;
  amount_millimes: number;
  status: "pending" | "completed" | "failed" | "expired";
  created_at: string;
  completed_at: string | null;
}

export interface UsageEvent {
  kind: UsageKind;
  platform: string;
  credits_used: number;
  created_at: string;
}

export interface LibraryFilters {
  platform?: SocialPlatform;
  status?: ProjectStatus;
  from?: string;
  to?: string;
  limit?: number;
}

export const queryKeys = {
  usage: ["usage"] as const,
  usageHistory: ["usage", "history"] as const,
  library: (filters: LibraryFilters = {}) => ["library", filters] as const,
  payments: ["payments"] as const,
};

function toQueryString(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useUsage() {
  return useQuery({
    queryKey: queryKeys.usage,
    queryFn: () => apiFetch<{ data: UsageSummary }>("/api/usage").then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useUsageHistory() {
  return useQuery({
    queryKey: queryKeys.usageHistory,
    queryFn: () => apiFetch<{ data: UsageEvent[] }>("/api/usage/history").then((r) => r.data),
  });
}

export function useLibrary(filters: LibraryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.library(filters),
    queryFn: () =>
      apiFetch<{ data: LibraryItem[] }>(`/api/library${toQueryString(filters)}`).then((r) => r.data),
  });
}

export function usePayments() {
  return useQuery({
    queryKey: queryKeys.payments,
    queryFn: () => apiFetch<{ data: PaymentRow[] }>("/api/billing/payments").then((r) => r.data),
  });
}

export interface SessionProfile {
  name: string;
  email: string;
}

export function useSessionProfile() {
  return useQuery({
    queryKey: ["session-profile"],
    queryFn: async (): Promise<SessionProfile> => {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      const email = user?.email ?? "";
      return {
        email,
        name: user?.user_metadata?.full_name || user?.user_metadata?.name || email.split("@")[0] || "Creator",
      };
    },
    staleTime: Infinity,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...changes
    }: { id: string } & Partial<Pick<LibraryItem, "title" | "status" | "planned_date">>) =>
      apiFetch(`/api/library/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/library/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["library"] }),
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (plan: Exclude<Plan, "free">) =>
      apiFetch<{ payUrl: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      }),
    onSuccess: ({ payUrl }) => {
      // Konnect hosts the payment page (card, e-Dinar, Flouci wallet)
      window.location.assign(payUrl);
    },
  });
}

export function useBillingSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ activated: boolean }>("/api/billing/sync", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.usage });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments });
    },
  });
}

/** Call after any action that spends credits. */
export function useRefreshAfterSpend() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.usage });
    queryClient.invalidateQueries({ queryKey: ["library"] });
  };
}
