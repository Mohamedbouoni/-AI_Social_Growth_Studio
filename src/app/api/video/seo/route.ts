import { NextResponse } from "next/server";
import { getSessionUser, handleApiError, unauthenticated } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { competitorService } from "@/modules/seo/competitor-service";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthenticated();

    const body = await request.json().catch(() => {
      throw new AppError("INVALID_REQUEST", "Invalid JSON body.", 400);
    });

    const result = await competitorService(user.id, body);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return handleApiError(err, "/api/video/seo");
  }
}
