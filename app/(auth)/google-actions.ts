"use server";

// "Continue with Google" (SCRUM-12).
//
// Supabase Auth runs the OAuth 2.0 / OpenID Connect exchange. Google never
// sends us a password, and we never ask for one. We only start the flow here;
// /auth/callback (app/auth/callback/route.ts) finishes it.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OAUTH_ERRORS, OAUTH_PROVIDER, safeNextPath } from "@/lib/auth/oauth";

/**
 * Where Google should send the user back to. Built from the configured site
 * URL when there is one, otherwise from this request's own Host header.
 * `next` is validated so it can only ever be a path on this site.
 */
async function callbackUrl(next: string | null): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  let origin = configured?.replace(/\/$/, "");
  if (!origin) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    origin = `${proto}://${host}`;
  }
  const target = safeNextPath(next, "");
  return `${origin}/auth/callback${target ? `?next=${encodeURIComponent(target)}` : ""}`;
}

export type GoogleSignInState = { error?: string };

/**
 * Used as a form action by the Sign In and Sign Up pages' Google buttons.
 * Returns an error message only if we couldn't even start the flow; on
 * success the browser is redirected to Google.
 */
export async function signInWithGoogle(
  _prev: GoogleSignInState,
  formData: FormData,
): Promise<GoogleSignInState> {
  const next = String(formData.get("next") ?? "") || null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: OAUTH_PROVIDER,
    options: {
      redirectTo: await callbackUrl(next),
      // Default scopes are enough: openid, email, profile (name and picture).
      // Always show Google's account chooser so a shared computer doesn't
      // silently reuse the previous person's Google session.
      queryParams: { prompt: "select_account" },
    },
  });

  // Supabase can't reach Google, or Google sign-in isn't switched on for the project.
  if (error || !data.url) return { error: OAUTH_ERRORS.unavailable };

  redirect(data.url);
}
