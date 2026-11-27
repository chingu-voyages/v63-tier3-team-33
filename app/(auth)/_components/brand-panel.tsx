import type { ReactNode } from "react";
import { CalendarIcon, ChartIcon, RocketIcon, UsersIcon } from "./icons";
import { Logo } from "./logo";

const FEATURES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <CalendarIcon className="size-5" />,
    title: "Create & Host Unforgettable Events",
    body: "Comprehensive organizer suites for ticketing, floor maps, agendas, and VIP management.",
  },
  {
    icon: <UsersIcon className="size-5" />,
    title: "Seamless Discovery & Instant Registration",
    body: "Fast 1-click check-ins, Apple Wallet digital badges, and interactive live Q&A sessions.",
  },
  {
    icon: <ChartIcon className="size-5" />,
    title: "AI-Powered Promotion & Real-Time Analytics",
    body: "Smart attendee segmentation, automated outreach campaigns, and real-time attendance telemetry.",
  },
];

/**
 * Left-hand marketing column on the sign-up page. Hidden below `lg`, so on
 * phones the form comes first. A Server Component: zero client JS.
 */
export function BrandPanel() {
  return (
    <section aria-label="About EventPlanner" className="hidden flex-col gap-8 px-4 py-2 lg:flex">
      <div className="space-y-4">
        <Logo />
        <div className="space-y-3 pt-2">
          <h1 className="text-5xl leading-none font-black tracking-tight text-slate-900">
            Join <span className="text-brand-600">EventPlanner</span>
            <br />
            Today!
          </h1>
          <p className="max-w-xl text-lg leading-7 text-slate-600">
            Create your account to design memorable conferences, manage attendee registrations, streamline
            ticketing, and unlock powerful AI-driven insights.
          </p>
        </div>
      </div>

      <ul className="space-y-4 pt-1">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="flex gap-4">
            <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl border border-brand-200/60 bg-brand-100/90 text-brand-600 shadow-xs">
              {feature.icon}
            </span>
            <div>
              <h2 className="font-bold text-slate-900">{feature.title}</h2>
              <p className="text-sm text-slate-500">{feature.body}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Showcase card. Swap the gradient for a real photo with next/image when
          design delivers the asset. The overlay keeps the banner text readable. */}
      <figure className="relative h-72 overflow-hidden rounded-3xl border border-white/60 bg-linear-to-br from-brand-300 via-brand-600 to-indigo-900 shadow-xl">
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
        <figcaption className="absolute bottom-4 left-4 flex items-center gap-3 rounded-2xl border border-white/20 bg-indigo-950/55 px-4 py-2.5 shadow-lg backdrop-blur-md">
          <span className="flex size-8 items-center justify-center rounded-xl bg-brand-500/80 text-white">
            <RocketIcon />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-wide text-white">Smarter Events. Greater Impact.</span>
            <span className="block text-[11px] text-purple-200">Plan, manage and analyze in one place</span>
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
