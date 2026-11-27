import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../_components/auth-card";
import { LogInIcon } from "../_components/icons";
import { Logo } from "../_components/logo";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="w-full max-w-xl space-y-6">
      <div className="flex justify-center">
        <Logo />
      </div>
      <AuthCard
        icon={<LogInIcon className="size-6" strokeWidth={2.2} />}
        title="Welcome back"
        subtitle="Sign in to manage or join your events"
      >
        <SignInForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          New to EventPlanner?{" "}
          <Link href="/sign-up" className="font-bold text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
