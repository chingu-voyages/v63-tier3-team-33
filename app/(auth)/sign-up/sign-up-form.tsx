"use client";

import { useActionState } from "react";
import { signUp, type SignUpState } from "../actions";
import { Field, FormAlert, PrimaryButton } from "../_components/form";
import { MailIcon, UserIcon } from "../_components/icons";
import { PasswordField } from "../_components/password-field";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/rules";
import { AccountTypePicker, Agreements, ReferralSelect } from "./form-parts";

export function SignUpForm() {
  // useActionState runs the Server Action and gives us its returned state
  // (errors etc.) plus `pending` while it runs. No form library needed.
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(signUp, {});
  const { errors = {}, values } = state;

  return (
    // `key` remounts the form after each submit so defaultValues pick up the
    // server-echoed values (React resets form fields after an action runs).
    // noValidate: the server returns our own messages instead of the browser's.
    <form key={JSON.stringify(values)} action={formAction} noValidate className="space-y-4">
      <FormAlert>{state.message}</FormAlert>

      <AccountTypePicker defaultValue={values?.accountType} error={errors.accountType} />

      <Field
        name="fullName"
        label="Full name"
        placeholder="Alex Morgan"
        autoComplete="name"
        required
        icon={<UserIcon />}
        defaultValue={values?.fullName}
        error={errors.fullName}
      />
      <Field
        name="email"
        type="email"
        label="Email address"
        placeholder="you@company.com"
        autoComplete="email"
        required
        icon={<MailIcon />}
        defaultValue={values?.email}
        error={errors.email}
      />

      <ReferralSelect defaultValue={values?.referralSource} />

      <PasswordField
        name="password"
        label="Password"
        placeholder={`Create a strong password (min. ${PASSWORD_MIN_LENGTH} chars)`}
        autoComplete="new-password"
        error={errors.password}
        showStrength
      />
      {/* Not in the design mock, but required by the acceptance criteria (AC2). */}
      <PasswordField
        name="confirmPassword"
        label="Confirm password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        error={errors.confirmPassword}
      />

      <Agreements
        acceptTerms={values?.acceptTerms}
        marketingOptIn={values?.marketingOptIn}
        termsError={errors.acceptTerms}
      />

      <PrimaryButton pending={pending} pendingLabel="Creating account…">
        Create Account
      </PrimaryButton>
    </form>
  );
}
