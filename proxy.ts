import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only protected areas pay for an auth check. Public pages and static assets
  // skip the proxy entirely. Add new protected sections here AND guard the page
  // itself with requireUser() — the proxy is a first line, not the only one.
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
