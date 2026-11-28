import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { REMEMBER_COOKIE, withSessionLifetime } from "@/lib/auth/signin";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client for Server Components and Server Actions.
 *
 * Create a new one per request and never share it between users: it reads the
 * signed-in user's session from this request's cookies.
 *
 * `remember` is only passed by the sign-in action, the one place the user
 * chooses. Everywhere else it's read back from the small `ep_remember` cookie
 * so a refreshed session keeps the lifetime the user picked: unticked means
 * "until the browser closes", ticked means 30 days.
 */
export async function createClient(options?: { remember?: boolean }) {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();
  const remember = options?.remember ?? cookieStore.get(REMEMBER_COOKIE)?.value === "1";

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
            cookieStore.set(name, value, withSessionLifetime(cookieOptions, remember)),
          );
          // Record the choice (only when it was just made) so refreshes honour it.
          if (options?.remember !== undefined) {
            cookieStore.set(
              REMEMBER_COOKIE,
              remember ? "1" : "0",
              withSessionLifetime(
                { path: "/", sameSite: "lax" as const, httpOnly: true, secure: process.env.NODE_ENV === "production" },
                remember,
              ),
            );
          }
        } catch {
          // Server Components can't set cookies (only Server Actions can).
          // That's fine: proxy.ts refreshes sessions before protected pages render.
        }
      },
    },
  });
}
