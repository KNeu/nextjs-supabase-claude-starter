// =============================================================================
// Supabase Auth Callback Handler
// =============================================================================
// GET /api/auth/callback
//
// Handles the OAuth redirect and magic link callbacks from Supabase.
// Exchanges the code for a session and redirects to the app.
//
// This route is registered as the "Redirect URL" in:
//   - Supabase Dashboard → Authentication → URL Configuration
//   - Google OAuth app settings
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirectTo") ?? "/chat";
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure the redirectTo path is relative (prevent open redirect)
      const safePath = redirectTo.startsWith("/") ? redirectTo : "/chat";
      return NextResponse.redirect(`${origin}${safePath}`);
    }

    console.error("OAuth code exchange failed:", error.message);
  }

  // Redirect to login with an error on failure
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
