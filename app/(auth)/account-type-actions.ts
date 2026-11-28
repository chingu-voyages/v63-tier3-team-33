"use server";

// The one-time role choice for a new Google user (SCRUM-12).
//
// Google doesn't know our roles, and profiles are read-only to normal users so
// nobody can promote themselves. The database function choose_account_type()
// is the single way to set your own role: once, manager or guest only.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AUTH_MESSAGES, homePathFor, isSelfServiceRole } from "@/lib/auth/rules";
import { safeNextPath } from "@/lib/auth/oauth";

export type ChooseAccountTypeState = { error?: string };

export async function chooseAccountType(
  _prev: ChooseAccountTypeState,
  formData: FormData,
): Promise<ChooseAccountTypeState> {
  const chosen = String(formData.get("accountType") ?? "");
  // Rejects "admin" and anything made up before the database is even asked.
  if (!isSelfServiceRole(chosen)) return { error: "Choose an account type." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/sign-in");

  const { data: updated, error } = await supabase.rpc("choose_account_type", { chosen });
  if (error) return { error: AUTH_MESSAGES.generic };

  // `false` means the role was already chosen (e.g. a second tab, or a returning
  // user opening this page). Don't treat that as an error: their role is
  // untouched, so just send them where they belong.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.claims.sub)
    .maybeSingle<{ role: string }>();
  if (!updated && !profile) redirect("/sign-in");

  const role = isSelfServiceRole(profile?.role) ? profile.role : chosen;
  const next = safeNextPath(String(formData.get("next") ?? ""), "");
  redirect(next || homePathFor(role));
}
