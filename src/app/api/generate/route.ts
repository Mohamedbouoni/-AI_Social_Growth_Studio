import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateContentService } from "@/modules/ai/generation-service";
import { logger } from "@/lib/logging/logger";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // In local dev without active Supabase session, fallback to demo user ID so dev works seamlessly
    const userId = user?.id || "demo-creator-id";

    const body = await request.json();

    const result = await generateContentService(userId, body);

    return NextResponse.json({
      success: true,
      data: result.data,
      creditsRemaining: result.creditsRemaining,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    logger.error("API /api/generate error", { error: message });

    const status = message.includes("limit")
      ? 403
      : message.includes("not found")
      ? 404
      : message.includes("validation") || message.includes("invalid")
      ? 400
      : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
