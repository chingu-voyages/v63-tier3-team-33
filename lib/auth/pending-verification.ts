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
 */
const COOKIE_NAME = "ep_pending_verification";
const MAX_AGE_SECONDS = 60 * 60 * 24;

export type PendingVerification = { email: string; sentAt: number };

export async function setPendingVerification(email: string): Promise<void> {
  const value: PendingVerification = { email, sentAt: Date.now() };
  (await cookies()).set(COOKIE_NAME, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getPendingVerification(): Promise<PendingVerification | null> {
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
      return { email: parsed.email, sentAt: parsed.sentAt };
    }
  } catch {
    // Malformed cookie: treat as missing.
  }
  return null;
}

export async function clearPendingVerification(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
