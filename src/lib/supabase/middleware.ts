// =============================================================================
// Supabase Middleware Client
// =============================================================================
// Used exclusively in src/proxy.ts to refresh sessions on every request.
// =============================================================================

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database.types";
import { env } from "@/lib/env";

export async function updateSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session — this must be called before any other Supabase call
  // in middleware. It extends the session expiry if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user } as unknown as NextResponse;
}
