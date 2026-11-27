import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { VerifiedBanner } from "@/app/_components/verified-banner";
import { SignOutButton } from "@/app/_components/sign-out-button";

export const metadata: Metadata = { title: "Set up your organisation" };

// Placeholder for the Organisation Setup ticket. It's the manager (event
// creator) landing page from AC5. Managers and admins only.
export default function OrganisationSetupPage(props: PageProps<"/onboarding/organisation">) {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/onboarding/organisation">, "searchParams">) {
  const user = await requireUser("manager", "admin");
  return (
    <>
      <VerifiedBanner searchParams={searchParams} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-800">Set up your organisation</h1>
        <SignOutButton />
      </div>
      <p className="text-zinc-600">
        Hi {user.fullName}, let&apos;s get your organisation ready so you can start creating events.
      </p>
    </>
  );
}
