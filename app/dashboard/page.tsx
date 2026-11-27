import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { VerifiedBanner } from "@/app/_components/verified-banner";
import { SignOutButton } from "@/app/_components/sign-out-button";

export const metadata: Metadata = { title: "Your events" };

// Placeholder for the Guest Dashboard ticket. It's the guest (and admin)
// landing page from AC5. It needs a verified, signed-in user of any role.
export default function DashboardPage(props: PageProps<"/dashboard">) {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const user = await requireUser();
  return (
    <>
      <VerifiedBanner searchParams={searchParams} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-800">Welcome, {user.fullName}</h1>
        <SignOutButton />
      </div>
      <p className="text-zinc-600">Events you&apos;re invited to will appear here.</p>
    </>
  );
}
