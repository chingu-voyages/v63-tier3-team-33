import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getPendingVerification } from "@/lib/auth/pending-verification";
import { ArrowLeftIcon, LockIcon, MailCheckIcon, ShieldCheckIcon, XIcon } from "../_components/icons";
import { VerifyPanel } from "./verify-panel";

export const metadata: Metadata = { title: "Verify your email" };

// The design shows this as a dialog. It's a real page here instead, so it
// works on refresh, survives the redirect from sign-up, and the back button
// behaves. The card and title are static (prerendered); only
// <PendingVerification> reads the request cookie, so it sits inside <Suspense>.
export default function VerifyEmailPage() {
  return (
    <section
      aria-labelledby="verify-title"
      className="relative w-full max-w-[540px] overflow-hidden rounded-2xl border border-white/80 bg-white px-6 pt-12 pb-8 shadow-[0_25px_50px_-12px_rgb(15_23_42/0.25),0_10px_40px_-10px_rgb(124_58_237/0.15)] sm:px-10 sm:pt-14"
    >
      {/* Top glow accent */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-brand-deep via-brand-600 to-[#6b38d4]" />

      {/* "Close": leaves verification and returns to sign in. */}
      <Link
        href="/sign-in"
        aria-label="Close and return to sign in"
        className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full text-[#7b7487] hover:bg-slate-100"
      >
        <XIcon />
      </Link>

      <header className="flex flex-col items-center gap-5 text-center">
        <span className="relative flex size-16 items-center justify-center rounded-2xl bg-linear-45 from-brand-deep to-brand-600 text-white shadow-[0_0_0_4px_rgb(234_221_255/0.5),0_10px_15px_-3px_rgb(124_58_237/0.3)]">
          <MailCheckIcon className="size-7" />
          <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-white text-brand-deep shadow-xs">
            <ShieldCheckIcon className="size-3.5" />
          </span>
        </span>
        <h1 id="verify-title" className="text-2xl font-bold tracking-tight text-[#131b2e]">
          Verify Your Email Address
        </h1>
      </header>

      <div className="mt-2">
        <Suspense fallback={<p className="py-16 text-center text-sm text-slate-500">Loading…</p>}>
          <PendingVerification />
        </Suspense>
      </div>

      <div className="mt-4 flex justify-center pt-1 pb-2">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-[#4a4455] hover:text-brand-deep"
        >
          <ArrowLeftIcon className="size-3" />
          Back to Sign In
        </Link>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 border-t border-[#ccc3d8]/40 pt-5 text-[11px] font-medium tracking-wide text-[#4a4455]">
        <LockIcon className="size-3.5 text-brand-deep" />
        Your code is single-use and expires automatically
      </p>
    </section>
  );
}

async function PendingVerification() {
  const pending = await getPendingVerification();

  if (!pending) {
    return (
      <p className="text-center text-sm leading-[22px] text-[#4a4455]">
        We couldn&apos;t find a sign-up waiting for verification.{" "}
        <Link href="/sign-in" className="font-semibold text-brand-deep hover:underline">
          Sign in
        </Link>{" "}
        to get a new code, or{" "}
        <Link href="/sign-up" className="font-semibold text-brand-deep hover:underline">
          create an account
        </Link>
        .
      </p>
    );
  }

  return <VerifyPanel email={pending.email} sentAt={pending.sentAt} />;
}
