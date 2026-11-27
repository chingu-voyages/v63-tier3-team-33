"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";
import { Field, FormAlert, PrimaryButton } from "../_components/form";
import { MailIcon } from "../_components/icons";
import { PasswordField } from "../_components/password-field";

export function SignInForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form key={state.email} action={formAction} noValidate className="space-y-4">
      <FormAlert>{state.message}</FormAlert>
      <Field
        name="email"
        type="email"
        label="Email address"
        placeholder="you@company.com"
        autoComplete="email"
        required
        icon={<MailIcon />}
        defaultValue={state.email}
      />
      <PasswordField name="password" label="Password" placeholder="Your password" autoComplete="current-password" />
      <div className="pt-2">
        <PrimaryButton pending={pending} pendingLabel="Signing in…">
          Sign In
        </PrimaryButton>
      </div>
    </form>
  );
}
