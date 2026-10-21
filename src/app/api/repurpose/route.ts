import { NextResponse } from "next/server";
import { repurposeService } from "@/modules/ai/repurpose-service";
import { getSessionUser, handleApiError, unauthenticated } from "@/lib/api";
import { AppError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthenticated();

    const body = await request.json().catch(() => {
      throw new AppError("INVALID_REQUEST", "Invalid JSON body.", 400);
    });

    const result = await repurposeService(user.id, body);

    return NextResponse.json({
      success: true,
      data: result.data,
      projectId: result.projectId,
      creditsRemaining: result.creditsRemaining,
    });
  } catch (err: unknown) {
    return handleApiError(err, "/api/repurpose");
  }
}
