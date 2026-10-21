import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, unauthenticated } from "@/lib/api";

const HISTORY_DAYS = 90;

// Raw usage events for the analytics charts; RLS limits rows to the user's workspaces
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthenticated();

    const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("generation_usage")
      .select("kind, platform, credits_used, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return handleApiError(err, "/api/usage/history");
  }
}
