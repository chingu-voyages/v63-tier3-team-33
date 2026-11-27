/**
 * Success confirmation shown once after email verification (AC5).
 * The verify action redirects with `?verified=1`.
 */
export async function VerifiedBanner({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string | string[] }>;
}) {
  const { verified } = await searchParams;
  if (verified !== "1") return null;
  return (
    <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      Your email is verified and your account is active. Welcome to EventPlanner!
    </p>
  );
}
