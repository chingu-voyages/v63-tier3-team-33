/**
 * Pure helpers for "Continue with Google": no network, cookies or framework
 * imports, so they're unit tested in oauth.test.ts.
 *
 * Supabase runs the OAuth 2.0 / OpenID Connect exchange with Google. When it
 * redirects back to us it sends either a `code` (success) or an `error` +
 * `error_code` (failure). These helpers turn that into safe, friendly output.
 */

// The ".ts" extension lets Node run the unit tests directly (see rules.test.ts).
import { homePathFor, isRole, type Role } from "./rules.ts";

export const OAUTH_PROVIDER = "google";

// --- Safe redirects ---------------------------------------------------------

/**
 * Only same-site paths may be used as a post-login destination.
 *
 * Without this, a crafted link like /auth/callback?next=https://evil.example
 * (or //evil.example, or /\evil.example) would send a freshly signed-in user to
 * an attacker's site. Anything that isn't a plain "/path" falls back to `fallback`.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  // Must start with exactly one "/", and not "//" or "/\" (both mean "another host").
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // Browsers strip tabs/newlines inside URLs, which can turn "/\t/evil.com" into "//evil.com".
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  return next;
}

// --- Error handling ---------------------------------------------------------

export const OAUTH_ERRORS = {
  cancelled: "Google sign-in was cancelled. You can try again or use your email and password.",
  emailUnavailable:
    "Google didn't share an email address, so we can't create or find your account. Use email and password instead.",
  emailUnverified:
    "Your Google email address isn't verified, so we can't use it to sign you in. Verify it with Google, or use email and password.",
  unavailable: "We couldn't reach Google. Check your connection and try again.",
  invalidSession: "Your sign-in session expired or was invalid. Please try again.",
  accountBlocked: "This account can't sign in right now. Contact support if you think this is a mistake.",
  signupClosed: "New sign-ups aren't open right now.",
  failed: "Google sign-in didn't work. You can try again or use your email and password.",
} as const;

export type OAuthErrorKey = keyof typeof OAUTH_ERRORS;

/**
 * Turns the `?oauth_error=` value on /sign-in back into our message.
 * Only our own keys are accepted, so a crafted link can't put arbitrary
 * text on the page.
 */
export function oauthErrorMessage(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  return Object.hasOwn(OAUTH_ERRORS, key) ? OAUTH_ERRORS[key as OAuthErrorKey] : OAUTH_ERRORS.failed;
}

/** What Supabase sends back on /auth/callback when something went wrong. */
export type OAuthErrorParams = {
  error?: string | null;
  error_code?: string | null;
  error_description?: string | null;
};

/**
 * Map the callback's error params to one of our messages.
 * Returns undefined when there's no error at all.
 *
 * We never show `error_description` to the user: it can contain provider or
 * server detail. It's only used here to recognise a few known cases.
 */
export function oauthErrorKey(params: OAuthErrorParams): OAuthErrorKey | undefined {
  const { error, error_code: code, error_description: description = "" } = params;
  if (!error && !code) return undefined;

  // Supabase errors first: they carry a specific code.
  if (code === "provider_email_needs_verification") return "emailUnverified";
  if (code === "signup_disabled") return "signupClosed";
  if (code === "user_banned") return "accountBlocked";
  if (code === "email_exists") return "emailUnverified"; // unverified email already in use
  if (code === "bad_oauth_state" || code === "bad_oauth_callback" || code === "flow_state_expired" || code === "flow_state_not_found") {
    return "invalidSession";
  }
  if (code === "request_timeout" || code === "hook_timeout") return "unavailable";

  // "Error getting user email from external provider" has no code of its own.
  if (/user email/i.test(description ?? "")) return "emailUnavailable";

  // Google/OAuth standard errors. `access_denied` is what Google sends when
  // the user clicks Cancel/Deny on the consent screen.
  if (error === "access_denied") return "cancelled";
  if (error === "temporarily_unavailable") return "unavailable";
  if (error === "invalid_request" || error === "invalid_grant") return "invalidSession";
  return "failed";
}

// --- After sign-in ----------------------------------------------------------

/** What a signed-in user's profile says, as read by the callback. */
export type OAuthProfile = { role: string; roleChosen: boolean } | null;

/**
 * Where to send someone right after Google sign-in.
 *
 * - No profile at all: something is wrong (e.g. the migration wasn't run).
 * - A new Google user who hasn't picked a role yet: the account-type screen.
 *   (`next` is carried along so a deep link survives the extra step.)
 * - Everyone else: `next` if given, otherwise their role's home. A returning
 *   user's role is never changed here.
 */
export function postOAuthPath(profile: OAuthProfile, next: string | null | undefined): string {
  if (!profile || !isRole(profile.role)) return "/sign-in";
  if (!profile.roleChosen) {
    const target = safeNextPath(next, "");
    return target ? `/choose-account-type?next=${encodeURIComponent(target)}` : "/choose-account-type";
  }
  return safeNextPath(next, homePathFor(profile.role as Role));
}
