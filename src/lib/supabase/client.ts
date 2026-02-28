// =============================================================================
// Supabase Browser Client
// =============================================================================
// Use this client in Client Components ("use client").
// It reads the session from cookies automatically via @supabase/ssr.
//
// Usage:
//   const supabase = createClient()
//   const { data: { user } } = await supabase.auth.getUser()
// =============================================================================

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { env } from "@/lib/env";

export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
