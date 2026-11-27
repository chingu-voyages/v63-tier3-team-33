// Pieces of the sign-up form split out to keep sign-up-form.tsx readable.
// No "use client" needed: they have no state or effects and are only
// imported by the client form, so they render on whichever side it does.
import type { ReactNode } from "react";
import { FieldError, labelClass } from "../_components/form";
import { BriefcaseIcon, ChevronDownIcon, SearchIcon, UsersIcon } from "../_components/icons";
import { REFERRAL_SOURCES, type SelfServiceRole } from "@/lib/auth/rules";

// Only the self-service roles are offered. Admin is never selectable; it's
// granted with SQL (see docs/auth_setup.md). The server rejects it too.
const ACCOUNT_OPTIONS: { value: SelfServiceRole; title: string; description: string; icon: ReactNode }[] = [
  { value: "manager", title: "Event Creator", description: "Create events & invite guests", icon: <BriefcaseIcon /> },
  { value: "guest", title: "Guest", description: "RSVP to events you're invited to", icon: <UsersIcon /> },
];

export function AccountTypePicker({ defaultValue = "manager", error }: { defaultValue?: string; error?: string }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className={`${labelClass} mb-1.5 text-slate-500`}>Select account type</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {ACCOUNT_OPTIONS.map((option) => (
          // The real radio is visually hidden (sr-only) but still focusable and
          // keyboard-operable. `has-checked:` styles the card from the radio's
          // state, so this needs no React state at all.
          <label
            key={option.value}
            className="group flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3.5 transition-colors hover:border-brand-300 has-checked:border-brand-600 has-checked:bg-brand-50/70 has-checked:shadow-xs has-focus-visible:ring-4 has-focus-visible:ring-brand-600/20"
          >
            <input
              type="radio"
              name="accountType"
              value={option.value}
              defaultChecked={defaultValue === option.value}
              className="sr-only"
            />
            {/* Custom radio dot */}
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white group-has-checked:border-brand-600">
              <span className="size-2 rounded-full group-has-checked:bg-brand-600" />
            </span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-has-checked:bg-brand-600 group-has-checked:text-white">
              {option.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900">{option.title}</span>
              <span className="block text-[11px] text-slate-500">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
      <FieldError>{error}</FieldError>
    </fieldset>
  );
}

export function ReferralSelect({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label htmlFor="field-referralSource" className={labelClass}>
          How did you hear about us
        </label>
        <span className="text-[11px] font-medium text-slate-400">Optional</span>
      </div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
        <select
          id="field-referralSource"
          name="referralSource"
          defaultValue={defaultValue}
          // appearance-none hides the native arrow so we can draw our own.
          className="block h-[42px] w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pr-10 pl-10 text-sm text-slate-700 shadow-xs focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/15 focus:outline-none"
        >
          <option value="">Select an option</option>
          {REFERRAL_SOURCES.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-gray-500" />
      </div>
    </div>
  );
}

type AgreementsProps = { acceptTerms?: boolean; marketingOptIn?: boolean; termsError?: string };

export function Agreements({ acceptTerms, marketingOptIn, termsError }: AgreementsProps) {
  return (
    <div className="space-y-2 pt-1 pb-2">
      <label className="flex items-start gap-2.5 text-xs leading-[18px] text-slate-600">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          defaultChecked={acceptTerms}
          aria-invalid={termsError ? true : undefined}
          aria-describedby={termsError ? "acceptTerms-error" : undefined}
          className="mt-px size-4 shrink-0 accent-brand-600"
        />
        {/* TODO: turn these into links once the Terms and Privacy pages exist. */}
        <span>
          I agree to the <span className="font-medium text-brand-600">Terms of Service</span> and{" "}
          <span className="font-medium text-brand-600">Privacy Policy</span>
        </span>
      </label>
      <FieldError id="acceptTerms-error">{termsError}</FieldError>
      <label className="flex items-start gap-2.5 text-xs leading-[18px] text-slate-500">
        <input
          type="checkbox"
          name="marketingOptIn"
          defaultChecked={marketingOptIn}
          className="mt-px size-4 shrink-0 accent-brand-600"
        />
        <span>Send me product updates and event planning insights</span>
      </label>
    </div>
  );
}
