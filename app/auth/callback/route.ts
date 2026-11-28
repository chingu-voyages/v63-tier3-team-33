import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OAUTH_ERRORS, oauthErrorKey, postOAuthPath, safeNextPath } from "@/lib/auth/oauth";

/**
 * Where Google (via Supabase) sends the user back after sign-in.
 *
 * Success:  /auth/callback?code=...   -> exchange the code for a session cookie,
 *           then redirect by role (new users pick an account type first).
 * Failure:  /auth/callback?error=...  -> back to /sign-in with a friendly message.
 *
 * This is a Route Handler (not a page) because it needs to set the session cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get("next");

  // 1. Google/Supabase reported a problem (cancelled, unverified email, ...).
  const errorKey = oauthErrorKey({
    error: searchParams.get("error"),
    error_code: searchParams.get("error_code"),
    error_description: searchParams.get("error_description"),
  });
  if (errorKey) return failure(origin, errorKey);

  // 2. No error and no code: someone opened this URL directly.
  const code = searchParams.get("code");
  if (!code) return failure(origin, "invalidSession");

  // 3. Exchange the one-time code for a session. This also validates the
  //    response: the code must be unused, unexpired and tied to the PKCE
  //    verifier cookie that was set when this browser started sign-in.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return failure(origin, "invalidSession");

  // 4. Where to? Read the role from `profiles`, never from the token (users
  //    can edit their own metadata, so it can't be trusted for access).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, role_chosen")
    .eq("id", data.user.id)
    .maybeSingle<{ role: string; role_chosen: boolean }>();

  const path = postOAuthPath(
    profile ? { role: profile.role, roleChosen: profile.role_chosen } : null,
    safeNextPath(next, ""),
  );
  return NextResponse.redirect(new URL(path, origin));
}

function failure(origin: string, key: keyof typeof OAUTH_ERRORS) {
  // The key (not the message text) travels in the URL; the sign-in page looks
  // up the wording itself, so nobody can put their own text on our page.
  return NextResponse.redirect(new URL(`/sign-in?oauth_error=${key}`, origin));
}
