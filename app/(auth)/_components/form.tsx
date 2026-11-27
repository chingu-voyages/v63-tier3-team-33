// Building blocks shared by the auth forms, styled to the EventPlanner design
// (uppercase labels, inputs with a leading icon, violet primary button).
// Folders starting with `_` are private in the App Router: they never become routes.
import type { InputHTMLAttributes, ReactNode } from "react";
import { ArrowRightIcon } from "./icons";

export const labelClass = "block text-xs font-semibold tracking-wider text-slate-600 uppercase";

/** `pl-10` leaves room for the leading icon; add `pr-10` when there's a trailing button. */
export const inputClass =
  "block h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 text-sm text-slate-900 " +
  "shadow-xs placeholder:text-gray-500 transition-colors focus:border-brand-600 focus:bg-white " +
  "focus:outline-none focus:ring-4 focus:ring-brand-600/15 aria-invalid:border-red-400 aria-invalid:focus:ring-red-500/15";

const primaryButtonBase =
  "group flex h-12 w-full items-center justify-center gap-2 px-4 font-bold text-white transition " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 " +
  "disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_10px_15px_-3px_rgb(124_58_237/0.3),0_4px_6px_-4px_rgb(124_58_237/0.3)]";

type PrimaryButtonProps = {
  children: ReactNode;
  pending?: boolean;
  pendingLabel?: string;
  /** "gradient" is the variant used on the verification screen. */
  variant?: "solid" | "gradient";
};

export function PrimaryButton({ children, pending, pendingLabel, variant = "solid" }: PrimaryButtonProps) {
  const look =
    variant === "gradient"
      ? "rounded-lg bg-linear-to-r from-brand-deep to-brand-600 text-sm hover:brightness-110"
      : "rounded-xl bg-brand-600 text-base hover:bg-brand-700";
  return (
    <button type="submit" disabled={pending} className={`${primaryButtonBase} ${look}`}>
      {pending ? pendingLabel : children}
      {!pending && <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />}
    </button>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
  icon: ReactNode;
  error?: string;
  /** Rendered on the right of the input, e.g. the show/hide password button. */
  trailing?: ReactNode;
};

/**
 * Labelled input with a leading icon. Errors are wired up for screen readers:
 * `aria-invalid` + `aria-describedby` point at the message.
 */
export function Field({ name, label, icon, error, trailing, className = "", ...inputProps }: FieldProps) {
  const id = `field-${name}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
          {icon}
        </span>
        <input
          id={id}
          name={name}
          className={`${inputClass} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        {trailing && <span className="absolute inset-y-0 right-0 flex items-center pr-3.5">{trailing}</span>}
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="pt-0.5 text-xs text-red-600">
      {children}
    </p>
  );
}

/** Form-level message. `role="alert"` makes screen readers announce errors. */
export function FormAlert({ tone = "error", children }: { tone?: "error" | "success"; children: ReactNode }) {
  if (!children) return null;
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-green-200 bg-green-50 text-green-800";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`w-full rounded-xl border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}

/** Small rounded icon tile used in card headers. */
export function IconBadge({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-12 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600 shadow-xs">
      {children}
    </span>
  );
}
