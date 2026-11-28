"use server";

// Email + password sign-in, sign-out and "Continue as Guest" (SCRUM-10).
//
// Supabase Auth checks the password (it stores only a hash) and rate-limits
// attempts per IP. We add validation, the account-type check, the
// Remember Me session lifetime and role-based redirects.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { clearPendingVerification, setPendingVerification } from "@/lib/auth/pending-verification";
import { AUTH_MESSAGES, authErrorMessage, hasErrors, homePathFor, isRole } from "@/lib/auth/rules";
import {
  accountTypeMismatch,
  isDemoVisitor,
  readSignInForm,
  validateSignIn,
  type SignInErrors,
} from "@/lib/auth/signin";

export type SignInState = {
  message?: string;
  errors?: SignInErrors;
  /** Echoed back so the form keeps what was typed. The password never is. */
  values?: { email: string; accountType: string; rememberMe: boolean };
};

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const input = readSignInForm(formData);
  const values = { email: input.email, accountType: input.accountType, rememberMe: input.rememberMe };

  const errors = validateSignIn(input);
  if (hasErrors(errors)) return { errors, values };

  // `remember` decides how long the session cookies live (see lib/auth/signin.ts).
  const supabase = await createClient({ remember: input.rememberMe });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
    options: input.captchaToken ? { captchaToken: input.captchaToken } : undefined,
  });

  if (error?.code === "email_not_confirmed") {
    // Right password, but the email was never verified. Send a fresh code and
    // continue on the verification screen. (If we're rate limited, the last
    // code is still valid.)
    await supabase.auth.resend({ type: "signup", email: input.email });
    await setPendingVerification(input.email);
    redirect("/verify-email");
  }
  // Wrong password and unknown email get the SAME message and status, so this
  // form can't be used to find out which emails are registered.
  if (error || !data.user) {
    return { message: error ? authErrorMessage(error) : AUTH_MESSAGES.generic, values };
  }

  // The password is correct from here on. Read the real role from `profiles`
  // (never from the token, which users can edit).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, role_chosen")
    .eq("id", data.user.id)
    .maybeSingle<{ role: string; role_chosen?: boolean }>();

  const role = profile?.role;
  if (!profile || !isRole(role)) {
    await supabase.auth.signOut({ scope: "local" });
    return { message: AUTH_MESSAGES.generic, values };
  }

  // The person picked Event Creator / Guest on the page. If that doesn't match
  // their account, tell them (safe now: they've proven who they are) and sign
  // them back out rather than leave them in under the wrong type.
  const mismatch = accountTypeMismatch(input.accountType, role);
  if (mismatch) {
    await supabase.auth.signOut({ scope: "local" });
    return { errors: { accountType: mismatch }, values };
  }

  redirect(homePathFor(role));
}

// --- Sign out ---------------------------------------------------------------

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  // "local" ends THIS browser's session only. The default is "global", which
  // would also sign the user out of their phone, other laptops, and so on.
  await supabase.auth.signOut({ scope: "local" });
  await clearPendingVerification();
  redirect("/sign-in");
}

// --- Continue as Guest ------------------------------------------------------

/**
 * "Continue as Guest" opens the public demo. It deliberately creates NO
 * session: there is nothing to sign in to, so a demo visitor can't reach any
 * account data, and no database rows are created. If the visitor is already
 * signed in (or holds an anonymous Supabase session), we leave that alone.
 */
export async function continueAsGuest(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  // A real account goes to its own home; an anonymous session or no session sees the demo.
  if (data?.claims && !isDemoVisitor(data.claims)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.claims.sub)
      .maybeSingle<{ role: string }>();
    if (profile && isRole(profile.role)) redirect(homePathFor(profile.role));
  }
  redirect("/demo");
}
