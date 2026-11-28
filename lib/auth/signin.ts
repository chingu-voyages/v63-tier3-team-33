/**
 * Pure rules for email/password sign-in (SCRUM-5): no network, cookies or
 * framework imports, so they're unit tested in signin.test.ts.
 */

// The ".ts" extension lets Node run the unit tests directly (see rules.test.ts).
import { isSelfServiceRole, normaliseEmail, validateEmail, type SelfServiceRole } from "./rules.ts";

// --- Remember Me ------------------------------------------------------------
//
// Supabase keeps a user signed in with a long-lived refresh token, stored in
// cookies. By default those cookies last 400 days, which is far too long for
// "I didn't tick Remember Me". We control it by choosing the cookie lifetime
// when the session cookies are written:
//
//   Remember Me unticked -> no maxAge: a "session cookie" that the browser
//                           deletes when it closes.
//   Remember Me ticked   -> 30 days, renewed whenever the session is refreshed
//                           (so it's 30 days since you last used the app).

export const REMEMBER_ME_DAYS = 30;
export const REMEMBER_ME_SECONDS = REMEMBER_ME_DAYS * 24 * 60 * 60;

/** Small, non-sensitive cookie that records the choice so refreshes keep it. */
export const REMEMBER_COOKIE = "ep_remember";

/** Browsers send an unticked checkbox as "missing" and a ticked one as "on". */
export function readRememberMe(formData: FormData): boolean {
  return formData.get("rememberMe") === "on";
}

type CookieOptionsLike = { maxAge?: number; expires?: Date; [key: string]: unknown };

/**
 * Adjusts the options Supabase wants to use for its auth cookies.
 * - Cookies being DELETED (maxAge 0) are left alone, so sign-out still works.
 * - Remember Me off: drop the lifetime so they end with the browser session.
 * - Remember Me on: 30 days.
 * Everything else (path, sameSite, secure, httpOnly, ...) is kept.
 */
export function withSessionLifetime<T extends CookieOptionsLike>(options: T, remember: boolean): T {
  if (options.maxAge === 0) return options;
  const adjusted: CookieOptionsLike = { ...options };
  delete adjusted.expires;
  if (remember) {
    adjusted.maxAge = REMEMBER_ME_SECONDS;
  } else {
    delete adjusted.maxAge;
  }
  return adjusted as T;
}

// --- Account type on the sign-in page ----------------------------------------

export type SignInInput = {
  email: string;
  password: string;
  /** What the person selected on the page. Must be a SelfServiceRole. */
  accountType: string;
  rememberMe: boolean;
  /**
   * Token from a CAPTCHA widget (hCaptcha or Turnstile), if the page shows one.
   * Passed straight to Supabase, which verifies it when CAPTCHA protection is
   * switched on in the dashboard. Leave unset when CAPTCHA is off.
   */
  captchaToken?: string;
};

export function readSignInForm(formData: FormData): SignInInput {
  const field = (name: string) => String(formData.get(name) ?? "");
  return {
    email: normaliseEmail(field("email")),
    // Never trimmed: spaces are valid password characters.
    password: field("password"),
    accountType: field("accountType"),
    rememberMe: readRememberMe(formData),
    // Both supported widgets use one of these two field names.
    captchaToken: field("captchaToken") || field("cf-turnstile-response") || field("h-captcha-response") || undefined,
  };
}

export type SignInErrors = Partial<Record<"email" | "password" | "accountType", string>>;

/**
 * Checks the form BEFORE asking Supabase anything. Intentionally lenient about
 * the password (only "not empty"): length rules apply when choosing a password,
 * not when entering one, and an older account may predate today's rules.
 */
export function validateSignIn(input: SignInInput): SignInErrors {
  const errors: SignInErrors = {};
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  if (!input.password) errors.password = "Enter your password.";
  if (!isSelfServiceRole(input.accountType)) errors.accountType = "Choose an account type.";
  return errors;
}

export const SIGN_IN_MESSAGES = {
  // Deliberately says nothing about WHICH part was wrong.
  invalidCredentials: "Incorrect email or password.",
  // Shown only after the password was correct, so it reveals nothing to a guesser.
  wrongAccountType: (actual: SelfServiceRole) =>
    actual === "manager"
      ? "This account is registered as an Event Creator. Select Event Creator to sign in."
      : "This account is registered as a Guest. Select Guest to sign in.",
} as const;

/**
 * Does the account type the person selected match their real role?
 *
 * Called only AFTER the password was verified, so a mismatch can safely say
 * what the real type is. Admins can sign in under either type (they aren't
 * offered as a choice on the page). Returns an error message, or undefined if fine.
 */
export function accountTypeMismatch(selected: string, actualRole: string): string | undefined {
  if (actualRole === "admin") return undefined;
  if (!isSelfServiceRole(selected) || !isSelfServiceRole(actualRole)) return SIGN_IN_MESSAGES.invalidCredentials;
  return selected === actualRole ? undefined : SIGN_IN_MESSAGES.wrongAccountType(actualRole);
}

// --- Guest (demo) access ----------------------------------------------------
//
// "Continue as Guest" does NOT create a Supabase session. It just opens the
// public /demo area, which shows sample data and needs no account.
//
// Why not Supabase "anonymous sign-ins"? Those users get the same `authenticated`
// database role as real accounts, so every `to authenticated` policy would
// apply to demo visitors, and the endpoint lets anyone create database rows.
// A session-less demo has nothing to leak.
//
// This check is the safety net: if anonymous sign-ins are ever switched on in
// the dashboard, such a session still must never be treated as an account.

/** True for a Supabase anonymous session (token claim `is_anonymous`). */
export function isDemoVisitor(claims: { is_anonymous?: unknown } | null | undefined): boolean {
  return claims?.is_anonymous === true;
}
