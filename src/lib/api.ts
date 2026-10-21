// =============================================================================
// Route Handler Helpers
// =============================================================================

import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logging/logger";

/** Returns the verified session user, or null. */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function unauthenticated() {
  return NextResponse.json(
    { success: false, code: "UNAUTHENTICATED", error: "Authentication required." },
    { status: 401 }
  );
}

/**
 * Maps thrown errors to JSON responses. Unexpected failures (provider, DB)
 * are logged in full but never echoed, since they may carry upstream details.
 */
export function handleApiError(err: unknown, route: string) {
  // Let Next.js handle its own control-flow errors (prerender bail-outs from
  // cookies()/request.url, redirect(), notFound()) instead of turning them into 500s
  unstable_rethrow(err);

  if (err instanceof ZodError) {
    return NextResponse.json(
      { success: false, code: "INVALID_REQUEST", error: "Invalid request.", issues: err.issues },
      { status: 400 }
    );
  }

  if (err instanceof AppError) {
    return NextResponse.json(
      { success: false, code: err.code, error: err.message },
      { status: err.status }
    );
  }

  logger.error(`API ${route} error`, {
    error: err instanceof Error ? err.message : String(err),
  });

  return NextResponse.json(
    { success: false, error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}
