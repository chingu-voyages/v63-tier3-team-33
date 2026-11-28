"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

type Props = {
  length: number;
  /** Name of the hidden input the joined code is submitted as. */
  name: string;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * One box per digit, submitted as a single hidden field so the Server Action
 * just reads `formData.get(name)`.
 *
 * Handles what people actually do: type, paste the whole code into any box,
 * use autofill from SMS/email (iOS/Android fill the first box with all
 * digits), backspace to the previous box, and arrow keys.
 */
export function OtpInput({ length, name, invalid, describedBy }: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (index: number) => inputs.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  // Writes digits starting at `start`, then moves focus to the next empty box.
  function fill(start: number, text: string) {
    const incoming = text.replace(/\D/g, "").slice(0, length - start).split("");
    if (incoming.length === 0) return;
    const next = [...digits];
    incoming.forEach((digit, offset) => (next[start + offset] = digit));
    setDigits(next);
    focus(start + incoming.length);
  }

  function onChange(index: number, value: string) {
    if (value === "") {
      setDigits((prev) => prev.map((d, i) => (i === index ? "" : d)));
      return;
    }
    fill(index, value);
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((prev) => prev.map((d, i) => (i === index - 1 ? "" : d)));
      focus(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focus(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focus(index + 1);
    }
  }

  function onPaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    fill(index, event.clipboardData.getData("text"));
  }

  const half = Math.ceil(length / 2);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" role="group" aria-label="Verification code">
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((digit, index) => (
        <span key={index} className="contents">
          {/* Dash between the two halves, like "582-…", purely visual. */}
          {index === half && <span aria-hidden="true" className="mx-0.5 h-0.5 w-2.5 rounded-full bg-[#ccc3d8]" />}
          <input
            ref={(el) => {
              inputs.current[index] = el;
            }}
            value={digit}
            onChange={(event) => onChange(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            onPaste={(event) => onPaste(index, event)}
            onFocus={(event) => event.target.select()}
            inputMode="numeric"
            // Only the first box advertises autofill, otherwise browsers offer it six times.
            autoComplete={index === 0 ? "one-time-code" : "off"}
            autoFocus={index === 0}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={describedBy}
            className={`size-12 rounded-lg border bg-white text-center text-2xl font-bold tracking-tight text-[#131b2e] shadow-xs transition sm:h-16 sm:w-14 ${
              invalid
                ? "border-red-400"
                : digit
                  ? "border-2 border-brand-600 ring-4 ring-brand-600/15"
                  : "border-slate-300"
            } focus:border-2 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none`}
          />
        </span>
      ))}
    </div>
  );
}
