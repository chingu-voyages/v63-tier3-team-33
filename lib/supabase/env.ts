/**
 * Read lazily (inside a function, not at import time) so `next build` doesn't
 * fail on machines without a `.env.local`; you get this clear error at runtime instead.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Copy .env.example to .env.local and fill in the values (see docs/auth_setup.md).",
    );
  }
  return { url, publishableKey };
}
