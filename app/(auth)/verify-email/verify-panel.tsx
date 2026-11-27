"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { resendCode, verifyEmail, type ResendState, type VerifyState } from "../actions";
import { FormAlert, PrimaryButton } from "../_components/form";
import { PencilIcon } from "../_components/icons";
import { OTP_EXPIRY_SECONDS, OTP_LENGTH, RESEND_COOLDOWN_SECONDS, formatCountdown } from "@/lib/auth/rules";
import { OtpInput } from "./otp-input";

type Props = { email: string; sentAt: number };

export function VerifyPanel({ email, sentAt }: Props) {
  const [verifyState, verifyAction, verifying] = useActionState<VerifyState, FormData>(verifyEmail, {});
  const [resendState, resendAction, resending] = useActionState<ResendState, FormData>(resendCode, {});

  // After a resend, the new timestamp comes back from the action.
  const lastSentAt = resendState.sentAt ?? sentAt;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center text-sm leading-[22px] text-[#4a4455]">
        <p>
          We sent a {OTP_LENGTH}-digit confirmation code to{" "}
          <strong className="font-semibold break-all text-[#131b2e]">{email}</strong>. Enter the code below to
          confirm your account. It expires in {OTP_EXPIRY_SECONDS / 60} minutes.
        </p>
        {/* Signing up again with the right address is the simplest "edit email":
            Supabase replaces the unverified sign-up and sends a new code. */}
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-brand-deep hover:underline"
        >
          <PencilIcon className="size-3" />
          Edit email
        </Link>
      </div>

      <form action={verifyAction} noValidate className="space-y-6">
        <FormAlert>{verifyState.error}</FormAlert>
        {/* `key` clears the boxes after a failed attempt so the user can retype quickly. */}
        <OtpInput
          key={verifyState.error}
          length={OTP_LENGTH}
          name="code"
          invalid={Boolean(verifyState.error)}
        />
        <PrimaryButton variant="gradient" pending={verifying} pendingLabel="Verifying…">
          Verify &amp; Activate Account
        </PrimaryButton>
      </form>

      <div className="space-y-3">
        <FormAlert>{resendState.error}</FormAlert>
        <FormAlert tone="success">{resendState.notice}</FormAlert>
        <form action={resendAction} className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm">
          <span className="text-[#4a4455]">Didn&apos;t receive the email?</span>
          {/* key: restart the countdown whenever a new code is sent */}
          <ResendControl key={lastSentAt} sentAt={lastSentAt} pending={resending} />
        </form>
      </div>
    </div>
  );
}

/**
 * Countdown, then a "Resend Now" button. The cooldown is a courtesy: Supabase
 * enforces the real limit server-side, and the action reports it if it's hit.
 */
function ResendControl({ sentAt, pending }: { sentAt: number; pending: boolean }) {
  // Start from `sentAt` so the server and browser render the same thing
  // (no hydration mismatch). The interval moves it to real time within a second.
  const [now, setNow] = useState(sentAt);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = Math.max(0, RESEND_COOLDOWN_SECONDS - (now - sentAt) / 1000);
  const waiting = secondsLeft > 0;

  return (
    <>
      {waiting && (
        <span className="text-xs font-semibold tracking-wide text-[#7b7487]">
          Resend code in <span className="text-brand-deep tabular-nums">{formatCountdown(secondsLeft)}</span>
          <span aria-hidden="true" className="px-1.5 text-[#ccc3d8]">•</span>
        </span>
      )}
      <button
        type="submit"
        disabled={waiting || pending}
        className="text-xs font-bold tracking-wide text-brand-deep hover:underline disabled:cursor-not-allowed disabled:text-[#b8b0c4] disabled:no-underline"
      >
        {pending ? "Sending…" : "Resend Now"}
      </button>
    </>
  );
}
