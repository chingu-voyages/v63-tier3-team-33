import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-brand-50 px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-brand-800 sm:text-5xl">EventPlanner</h1>
      <p className="max-w-md text-lg text-zinc-600">Plan events and bring your guests together.</p>
      <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <Link
          href="/sign-up"
          className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Get started
        </Link>
        <Link
          href="/sign-in"
          className="rounded-lg border border-brand-200 bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-100"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
