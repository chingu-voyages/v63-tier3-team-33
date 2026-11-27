import Link from "next/link";
import { CalendarCheckIcon } from "./icons";

export function Logo() {
  return (
    <Link href="/" className="flex w-fit items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-linear-45 from-brand-700 via-brand-600 to-indigo-500 text-white shadow-[0_4px_6px_-1px_rgb(139_92_246/0.25),0_2px_4px_-2px_rgb(139_92_246/0.25)]">
        <CalendarCheckIcon className="size-7" strokeWidth={2.2} />
      </span>
      <span>
        <span className="block text-3xl leading-9 font-extrabold tracking-tight text-slate-900">
          Event<span className="text-brand-600">Planner</span>
        </span>
        <span className="block text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Plan • Manage • Analyze
        </span>
      </span>
    </Link>
  );
}
