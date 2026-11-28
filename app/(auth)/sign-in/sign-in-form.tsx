"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../sign-in-actions";
import { Field, FormAlert, PrimaryButton } from "../_components/form";
import { MailIcon } from "../_components/icons";
import { PasswordField } from "../_components/password-field";
import { AccountTypePicker } from "../sign-up/form-parts";

export function SignInForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});
  const { errors = {}, values } = state;

  return (
    // `key` remounts the form after each submit so defaultValues pick up the
    // server-echoed values. The password is never echoed back.
    <form key={JSON.stringify(values)} action={formAction} noValidate className="space-y-4">
      <FormAlert>{state.message}</FormAlert>
      {/* Required: signIn rejects a missing type and checks it against the account's real role. */}
      <AccountTypePicker defaultValue={values?.accountType} error={errors.accountType} />
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
      <PasswordField
        name="password"
        label="Password"
        placeholder="Your password"
        autoComplete="current-password"
        error={errors.password}
      />
      <div className="pt-2">
        <PrimaryButton pending={pending} pendingLabel="Signing in…">
          Sign In
        </PrimaryButton>
      </div>
    </form>
  );
}
