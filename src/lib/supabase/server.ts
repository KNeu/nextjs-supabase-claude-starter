// =============================================================================
// Supabase Server Client
// =============================================================================
// Use this client in Server Components, Server Actions, and API Route Handlers.
// It reads/writes cookies via next/headers for session management.
//
// Usage:
//   const supabase = await createClient()
//   const { data: { user } } = await supabase.auth.getUser()
//
// IMPORTANT: Never use the browser client in server-side code. It won't have
// access to cookies and will always return an unauthenticated session.
// =============================================================================

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { env } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component — cookies can't be
            // set in that context, but the session will still be readable.
          }
        },
      },
    }
  );
}

// =============================================================================
// Admin Client (Service Role)
// =============================================================================
// Bypasses Row Level Security. Only use in trusted server-only code such as:
// - Stripe webhook handlers
// - Background jobs
// - Admin operations
//
// Never expose this client to the browser or use it in Server Components
// that could be called with arbitrary user input.
// =============================================================================

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
