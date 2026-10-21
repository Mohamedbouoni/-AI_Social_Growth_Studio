import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, unauthenticated } from "@/lib/api";

// Payment history for the billing page; RLS limits rows to the user's workspaces
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthenticated();

    const { data, error } = await supabase
      .from("payments")
      .select("id, plan, amount_millimes, status, created_at, completed_at")
      .neq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return handleApiError(err, "/api/billing/payments");
  }
}
