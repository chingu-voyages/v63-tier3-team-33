import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homePathFor, isRole, isSelfServiceRole, type Role } from "./rules";
import { isDemoVisitor } from "./signin";

type ProfileRow = { full_name: string; role: string };

export type CurrentUser = {
  id: string;
  fullName: string;
  role: Role;
};

/**
 * Picks the landing page right after sign-in/verification, using the metadata
 * Supabase already returned (no extra DB query).
 *
 * Users can edit their own `user_metadata`, so this is NEVER used for access
 * control. Only self-service roles are honoured here; an admin (whose role
 * lives in the DB, not metadata) lands on the dashboard, which is correct.
 * If someone tampers with it, the destination's requireUser() check sends
 * them to the right place.
 */
export function landingPathFor(user: User): string {
  const claimed: unknown = user.user_metadata?.role;
  return homePathFor(isSelfServiceRole(claimed) ? claimed : "guest");
}

/**
 * The real permission check. Roles come from `public.profiles`, which only
 * admins can modify (enforced by RLS; see supabase/migrations).
 *
 * Use at the top of every protected Server Component or Server Action:
 *   requireUser()                    -> any signed-in, verified user
 *   requireUser("manager", "admin")  -> only those roles
 *
 * Admins are NOT allowed implicitly: list "admin" wherever they should have
 * access. Being explicit keeps each page's access rule readable in one place.
 *
 * Signed-out users go to /sign-in; users without a permitted role go to their
 * own home page.
 */
export async function requireUser(...allowed: Role[]): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/sign-in");

  // Never let an anonymous Supabase session act as an account. (Guest access
  // is the public /demo, which has no session; see lib/auth/signin.ts. This is
  // the safety net in case anonymous sign-ins are ever switched on.)
  if (isDemoVisitor(data.claims)) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();
  const role = profile?.role;
  if (!profile || !isRole(role)) redirect("/sign-in");

  if (allowed.length > 0 && !allowed.includes(role)) {
    redirect(homePathFor(role));
  }

  return { id: userId, fullName: profile.full_name, role };
}

