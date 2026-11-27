import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../_components/auth-card";
import { BrandPanel } from "../_components/brand-panel";
import { UserPlusIcon } from "../_components/icons";
import { Logo } from "../_components/logo";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

// Static page: no cookies are read, so it's prerendered and loads instantly.
// Only <SignUpForm> (and the password field inside it) ship client JS.
export default function SignUpPage() {
  return (
    <div className="grid w-full max-w-[1200px] items-center gap-12 lg:grid-cols-[1fr_576px]">
      <BrandPanel />

      <div className="mx-auto w-full max-w-xl space-y-6">
        {/* On small screens the brand panel is hidden, so show the logo above the card. */}
        <div className="flex justify-center lg:hidden">
          <Logo />
        </div>
        <AuthCard
          icon={<UserPlusIcon className="size-6" strokeWidth={2.2} />}
          title="Create your Account"
          subtitle="Choose your primary role and fill in your details to get started"
        >
          <SignUpForm />
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-bold text-brand-600 hover:underline">
              Sign In
            </Link>
          </p>
        </AuthCard>
      </div>
    </div>
  );
}
