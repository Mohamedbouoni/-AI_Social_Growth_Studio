import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  generateContentService,
  GenerationError,
} from "@/modules/ai/generation-service";
import { logger } from "@/lib/logging/logger";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const result = await generateContentService(user.id, body);

    return NextResponse.json({
      success: true,
      data: result.data,
      creditsRemaining: result.creditsRemaining,
    });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid generation request.", issues: err.issues },
        { status: 400 }
      );
    }

    if (err instanceof GenerationError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.status }
      );
    }

    // Unexpected failures (provider errors, DB errors) are logged in full but
    // never echoed to the client, since they may contain upstream details.
    const message = err instanceof Error ? err.message : String(err);
    logger.error("API /api/generate error", { error: message });

    return NextResponse.json(
      { success: false, error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
