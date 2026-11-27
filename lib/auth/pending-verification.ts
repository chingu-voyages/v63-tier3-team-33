import "server-only";
import { cookies } from "next/headers";

/**
 * Remembers which email is waiting for a code, and when we sent it.
 *
 * Why a cookie instead of `?email=` in the URL? It keeps the address out of
 * browser history and logs. httpOnly means page scripts can't read it.
 *
 * It isn't signed. Editing it only lets someone change which error message
 * they see; a valid code is still required to verify.
 *
 * `purpose` keeps the two flows apart: a sign-up cookie can't drive the
 * password-reset screens and vice versa.
 */
const COOKIE_NAME = "ep_pending_verification";
const MAX_AGE_SECONDS = 60 * 60 * 24;

export type VerificationPurpose = "signup" | "recovery";
export type PendingVerification = { email: string; sentAt: number; purpose: VerificationPurpose };

export async function setPendingVerification(
  email: string,
  purpose: VerificationPurpose = "signup",
): Promise<void> {
  const value: PendingVerification = { email, sentAt: Date.now(), purpose };
  (await cookies()).set(COOKIE_NAME, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Returns the pending verification only if it was started for `purpose`. */
export async function getPendingVerification(
  purpose: VerificationPurpose = "signup",
): Promise<PendingVerification | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "email" in parsed &&
      "sentAt" in parsed &&
      typeof parsed.email === "string" &&
      typeof parsed.sentAt === "number"
    ) {
      // Cookies written before `purpose` existed were always sign-ups.
      const stored = "purpose" in parsed && parsed.purpose === "recovery" ? "recovery" : "signup";
      if (stored !== purpose) return null;
      return { email: parsed.email, sentAt: parsed.sentAt, purpose: stored };
    }
  } catch {
    // Malformed cookie: treat as missing.
  }
  return null;
}

export async function clearPendingVerification(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
