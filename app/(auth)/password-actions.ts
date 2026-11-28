"use server";

// Forgot password (SCRUM-11): request a code, verify it, set a new password.
//
// Supabase Auth does the security-critical work:
// - generates a single-use, time-limited code and emails it (via Brevo SMTP)
// - rate-limits requests and invalidates older codes when a new one is sent
// - hashes the new password and wipes every outstanding code once it changes
// We add validation, neutral messages, and a short "reset window".

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  clearPendingVerification,
  getPendingVerification,
  setPendingVerification,
} from "@/lib/auth/pending-verification";
import {
  RESET_MESSAGES,
  authErrorMessage,
  canResetPassword,
  hasErrors,
  normaliseEmail,
  otpErrorMessage,
  validateEmail,
  validateOtp,
  validatePasswordPair,
  type AmrClaim,
  type PasswordPairErrors,
} from "@/lib/auth/rules";

// --- AC1/AC2: request a code ------------------------------------------------

export type ForgotPasswordState = { error?: string; email?: string };

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  const invalid = validateEmail(email);
  if (invalid) return { error: invalid, email };

  const supabase = await createClient();
  // Supabase returns success even when no account has this email, so this
  // can't be used to find out who's registered. Only real accounts get a code.
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: authErrorMessage(error), email };

  await setPendingVerification(email, "recovery");
  redirect("/forgot-password/verify");
}

// --- AC3: verify the code ---------------------------------------------------

export type VerifyResetState = { error?: string };

export async function verifyResetCode(
  _prev: VerifyResetState,
  formData: FormData,
): Promise<VerifyResetState> {
  const pending = await getPendingVerification("recovery");
  if (!pending) return { error: RESET_MESSAGES.sessionMissing };

  const code = String(formData.get("code") ?? "").replace(/[\s-]/g, "");
  const invalid = validateOtp(code);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  // Supabase checks the code is correct, unexpired and unused, then deletes it
  // so it can't be used again, and signs the user in (session cookies set).
  const { error } = await supabase.auth.verifyOtp({
    email: pending.email,
    token: code,
    type: "recovery",
  });
  if (error) return { error: otpErrorMessage(error, pending.sentAt, Date.now()) };

  await clearPendingVerification();
  redirect("/reset-password");
}

// --- AC3: resend the code ---------------------------------------------------

export type ResendResetState = { error?: string; notice?: string; sentAt?: number };

export async function resendResetCode(): Promise<ResendResetState> {
  const pending = await getPendingVerification("recovery");
  if (!pending) return { error: RESET_MESSAGES.sessionMissing };

  const supabase = await createClient();
  // Rate-limited by Supabase (60s per address by default); a new code makes the old one invalid.
  const { error } = await supabase.auth.resetPasswordForEmail(pending.email);
  if (error) return { error: authErrorMessage(error) };

  await setPendingVerification(pending.email, "recovery");
  return { notice: "A new code is on its way. Older codes no longer work.", sentAt: Date.now() };
}

// --- AC4/AC5: set the new password ------------------------------------------

export type ResetPasswordState = { error?: string; errors?: PasswordPairErrors };

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // Check the session first: no point validating a form we won't accept.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: RESET_MESSAGES.sessionMissing };
  if (!canResetPassword(data.claims.amr as AmrClaim, Math.floor(Date.now() / 1000))) {
    return { error: RESET_MESSAGES.resetWindowExpired };
  }

  const errors = validatePasswordPair(password, confirmPassword);
  if (hasErrors(errors)) return { errors };

  // Supabase hashes the new password, invalidates the old one, and signs out
  // every OTHER session (other devices) for this user.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorMessage(error) };

  // Security policy: end this session too, so the user proves the new
  // password works by signing in with it.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/sign-in?reset=1");
}
