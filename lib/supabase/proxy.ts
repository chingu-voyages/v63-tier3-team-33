import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

/**
 * Runs before protected pages (see the matcher in /proxy.ts):
 * 1. refreshes the session if the access token is about to expire, and
 * 2. sends signed-out visitors to /sign-in.
 *
 * Unverified users never get a session (Supabase only issues one after the
 * email code is confirmed), so this also keeps them out of protected pages.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        // Refreshed tokens must reach both the page about to render (request)
        // and the browser (response).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // No-cache headers so a CDN never serves one user's cookies to another.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Keep this call directly after createServerClient. getClaims verifies the
  // JWT locally (no network call with asymmetric keys) and refreshes it if needed.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.search = "";
    return NextResponse.redirect(signInUrl);
  }

  return response;
}
