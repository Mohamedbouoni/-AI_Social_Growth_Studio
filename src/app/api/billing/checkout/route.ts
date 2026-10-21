import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, handleApiError, unauthenticated } from "@/lib/api";
import { createCheckout } from "@/modules/billing/payment-service";

const checkoutSchema = z.object({ plan: z.enum(["creator", "growth"]) });

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthenticated();

    const { plan } = checkoutSchema.parse(await request.json().catch(() => ({})));
    const { payUrl } = await createCheckout(user.id, plan, {
      email: user.email,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name,
    });

    return NextResponse.json({ success: true, payUrl });
  } catch (err: unknown) {
    return handleApiError(err, "/api/billing/checkout");
  }
}
