import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, unauthenticated } from "@/lib/api";
import { getCreditsUsed, getEntitlement } from "@/modules/billing/entitlement";
import { CREDIT_COST } from "@/types";

// Read-only: runs as the user, so RLS scopes every query to their workspace
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthenticated();

    const entitlement = await getEntitlement(supabase, user.id);
    const used = await getCreditsUsed(supabase, entitlement.workspaceId, entitlement.cycleStart);
    const limit = entitlement.config.credits;

    return NextResponse.json({
      success: true,
      data: {
        plan: entitlement.plan,
        credits: { used, limit, remaining: Math.max(0, limit - used) },
        creditCost: CREDIT_COST,
        cycle: {
          start: entitlement.cycleStart.toISOString(),
          end: entitlement.cycleEnd.toISOString(),
        },
        passEnd: entitlement.passEnd?.toISOString() ?? null,
        features: entitlement.config.features,
      },
    });
  } catch (err: unknown) {
    return handleApiError(err, "/api/usage");
  }
}
