"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { landingPathFor } from "@/lib/auth/session";
import {
  clearPendingVerification,
  getPendingVerification,
  setPendingVerification,
} from "@/lib/auth/pending-verification";
import {
  AUTH_MESSAGES,
  authErrorMessage,
  hasErrors,
  normaliseEmail,
  otpErrorMessage,
  readSignUpForm,
  validateOtp,
  validateSignUp,
  type SignUpErrors,
  type SignUpInput,
} from "@/lib/auth/rules";

// Every action below is a public endpoint anyone can POST to, so each one
// validates its own input. Client-side checks are only for convenience.

// --- Sign up (AC2, AC3) -----------------------------------------------------

export type SignUpState = {
  errors?: SignUpErrors;
  message?: string;
  /** Echoed back so the form keeps what the user typed. Passwords are never echoed. */
  values?: Omit<SignUpInput, "password" | "confirmPassword">;
};

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const input = readSignUpForm(formData);
  const { password, confirmPassword, ...values } = input; // eslint-disable-line @typescript-eslint/no-unused-vars

  const errors = validateSignUp(input);
  if (hasErrors(errors)) return { errors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    // Supabase hashes the password (bcrypt). We never store or log it.
    password: input.password,
    options: {
      data: {
        // A DB trigger copies these two into public.profiles (see supabase/migrations).
        // The trigger only accepts "manager" or "guest", so even a forged
        // "admin" here would land as guest. validateSignUp rejects it first anyway.
        full_name: input.fullName,
        role: input.accountType,
        // Informational only, kept in auth metadata (never used for permissions).
        referral_source: input.referralSource || null,
        marketing_opt_in: input.marketingOptIn,
        terms_accepted_at: new Date().toISOString(),
      },
    },
  });

  if (error) return { message: authErrorMessage(error), values };

  // With "Confirm email" on, Supabase doesn't return an error for an email that's
  // already verified (so attackers can't probe for accounts). It returns a fake
  // user with no identities instead. We tell real users so they can sign in.
  if (data.user && data.user.identities?.length === 0) {
    return { errors: { email: AUTH_MESSAGES.emailTaken }, values };
  }

  await setPendingVerification(input.email);
  redirect("/verify-email");
}

// --- Verify code (AC3, AC5) -------------------------------------------------

export type VerifyState = { error?: string };

export async function verifyEmail(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const pending = await getPendingVerification();
  if (!pending) return { error: AUTH_MESSAGES.verificationSessionMissing };

  // Strip spaces/dashes: people often paste "123 456".
  const code = String(formData.get("code") ?? "").replace(/[\s-]/g, "");
  const invalid = validateOtp(code);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: pending.email,
    token: code,
    type: "email",
  });

  if (error || !data.user) {
    return { error: error ? otpErrorMessage(error, pending.sentAt, Date.now()) : AUTH_MESSAGES.generic };
  }

  // Success: Supabase has marked the email as confirmed and set session cookies.
  // We redirect from the server (not the client) because clearing the cookie
  // re-renders this page, which would unmount the form. `?verified=1` makes the
  // landing page show the success message.
  await clearPendingVerification();
  redirect(`${landingPathFor(data.user)}?verified=1`);
}

// --- Resend code (AC4) ------------------------------------------------------

export type ResendState = {
  error?: string;
  notice?: string;
  /** When the latest code was sent (ms). The client uses it for the cooldown timer. */
  sentAt?: number;
};

// useActionState passes (prevState, formData); this action needs neither.
export async function resendCode(): Promise<ResendState> {
  const pending = await getPendingVerification();
  if (!pending) return { error: AUTH_MESSAGES.verificationSessionMissing };

  const supabase = await createClient();
  // Supabase enforces the rate limit server-side and invalidates the previous
  // code when it issues a new one, so we don't need our own OTP table.
  const { error } = await supabase.auth.resend({ type: "signup", email: pending.email });
  if (error) return { error: authErrorMessage(error) };

  await setPendingVerification(pending.email); // restarts the expiry clock
  return { notice: "A new code is on its way. Older codes no longer work.", sentAt: Date.now() };
}

// --- Sign in ----------------------------------------------------------------

export type SignInState = { message?: string; email?: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = normaliseEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { message: "Enter your email and password.", email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error?.code === "email_not_confirmed") {
    // The account exists but was never verified. Send a fresh code and pick up
    // where they left off. If we're rate limited, the last code is still valid.
    await supabase.auth.resend({ type: "signup", email });
    await setPendingVerification(email);
    redirect("/verify-email");
  }
  if (error || !data.user) {
    return { message: error ? authErrorMessage(error) : AUTH_MESSAGES.generic, email };
  }

  redirect(landingPathFor(data.user));
}

// --- Sign out ---------------------------------------------------------------

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearPendingVerification();
  redirect("/sign-in");
}
