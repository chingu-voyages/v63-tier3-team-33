// `(auth)` is a route group: the parentheses keep it out of the URL, so
// app/(auth)/sign-up/page.tsx is served at /sign-up. Pages in the group share
// this backdrop and footer; each page lays out its own content.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-auth-backdrop">
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:p-10">{children}</main>
      <footer className="border-t border-purple-100/60 bg-white/40 px-4 py-4 backdrop-blur-xs">
        {/* Static on purpose: `new Date()` would make every auth page render per request. */}
        <p className="text-center text-xs text-slate-400">© 2026 EventPlanner. All rights reserved.</p>
      </footer>
    </div>
  );
}
