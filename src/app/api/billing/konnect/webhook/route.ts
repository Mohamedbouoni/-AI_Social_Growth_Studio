import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { verifyPayment } from "@/modules/billing/payment-service";

// Konnect notifies with an unauthenticated GET carrying the payment reference.
// Nothing in the request is trusted: verifyPayment() re-fetches the payment
// from Konnect's API and only acts on refs we issued ourselves.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentRef = searchParams.get("payment_ref") ?? searchParams.get("paymentRef");

    if (!paymentRef || paymentRef.length > 64) {
      return NextResponse.json({ success: false, error: "Missing payment reference." }, { status: 400 });
    }

    const outcome = await verifyPayment(paymentRef);
    if (outcome === "unknown") {
      return NextResponse.json({ success: false, error: "Unknown payment." }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: outcome });
  } catch (err: unknown) {
    return handleApiError(err, "/api/billing/konnect/webhook");
  }
}
