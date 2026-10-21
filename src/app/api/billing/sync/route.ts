import { NextResponse } from "next/server";
import { getSessionUser, handleApiError, unauthenticated } from "@/lib/api";
import { syncPendingPayments } from "@/modules/billing/payment-service";

// Called by the billing page when the payer returns from Konnect, in case the
// webhook is late or never arrives.
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthenticated();

    const outcomes = await syncPendingPayments(user.id);
    const activated = outcomes.includes("activated") || outcomes.includes("already_completed");

    return NextResponse.json({ success: true, activated, outcomes });
  } catch (err: unknown) {
    return handleApiError(err, "/api/billing/sync");
  }
}
