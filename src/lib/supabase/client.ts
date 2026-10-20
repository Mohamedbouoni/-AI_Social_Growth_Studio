// =============================================================================
// Supabase Browser Client
// =============================================================================
// Use this in Client Components (anything with "use client").
// Creates a singleton Supabase client for the browser.
// =============================================================================

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
