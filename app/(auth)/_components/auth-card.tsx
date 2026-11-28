import type { ReactNode } from "react";
import { IconBadge } from "./form";

type Props = {
  icon: ReactNode;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
};

/** The white card with the centred icon/title header used by sign up and sign in. */
export function AuthCard({ icon, title, subtitle, children }: Props) {
  return (
    <div className="w-full rounded-3xl border border-purple-100/70 bg-white p-6 shadow-[0_20px_45px_-12px_rgb(109_40_217/0.08),0_8px_16px_-8px_rgb(0_0_0/0.03)] sm:p-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <IconBadge>{icon}</IconBadge>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </header>
      <div className="mt-6">{children}</div>
    </div>
  );
}
