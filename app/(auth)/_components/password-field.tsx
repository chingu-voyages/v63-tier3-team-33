"use client";

import { useState } from "react";
import { passwordStrength } from "@/lib/auth/rules";
import { Field } from "./form";
import { EyeIcon, EyeOffIcon, LockIcon } from "./icons";

type Props = {
  name: string;
  label: string;
  placeholder: string;
  autoComplete: "new-password" | "current-password";
  error?: string;
  /** Show the 4-bar strength meter under the input (sign-up only). */
  showStrength?: boolean;
};

const BAR_COLOURS = ["bg-slate-200", "bg-red-400", "bg-amber-400", "bg-brand-500", "bg-brand-600"];
const LABEL_COLOURS = ["", "text-red-600", "text-amber-600", "text-brand-600", "text-brand-700"];

/** Password input with a show/hide toggle and an optional strength meter. */
export function PasswordField({ name, label, placeholder, autoComplete, error, showStrength }: Props) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const strength = passwordStrength(value);

  return (
    <div className="space-y-1.5">
      <Field
        name={name}
        label={label}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        icon={<LockIcon />}
        error={error}
        className="pr-10"
        onChange={(event) => setValue(event.target.value)}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="rounded text-slate-400 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
      />

      {showStrength && (
        <div className="space-y-1 pt-1.5">
          <div className="flex gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  strength.score >= bar ? BAR_COLOURS[strength.score] : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Use 8+ characters with a mix of letters, numbers & symbols</span>
            {/* aria-live so screen readers hear the strength change as they type. */}
            <span aria-live="polite" className={`font-semibold ${LABEL_COLOURS[strength.score]}`}>
              {strength.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
