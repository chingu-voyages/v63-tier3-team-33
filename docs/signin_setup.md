# Sign-in: behaviour and dashboard setup

Email and password sign-in, Remember Me, Continue as Guest and sign-out.
Supabase Auth checks the password (it stores only a hash) and does the rate
limiting. Our code is in `app/(auth)/sign-in-actions.ts`, with the testable
rules in `lib/auth/signin.ts`.

```
Sign in form ──signInWithPassword()──► Supabase checks password + rate limit
   │   wrong password / unknown email ──► the SAME "Incorrect email or password."
   │   right password, email not verified ──► new code sent ──► /verify-email
   ▼
role read from public.profiles (never from the token)
   │   selected account type ≠ real role ──► "This account is registered as a Guest…", signed back out
   ▼
manager → /onboarding/organisation      guest, admin → /dashboard

Continue as Guest ──► /demo (public, sample data, NO session)
```

## Who handles each requirement

| Requirement | How |
| --- | --- |
| Passwords never stored in plain text | Supabase stores a bcrypt hash; we never see or log the password |
| Only verified users sign in | Supabase refuses unverified accounts (`email_not_confirmed`); we send a fresh code and continue on `/verify-email` |
| Wrong credentials | One message for wrong password and unknown email, so the form can't reveal which emails are registered |
| Account type must match | Checked only **after** the password is verified, so a mismatch message can't be used to probe accounts |
| Roles enforced | `requireUser(...roles)` reads `profiles` on every protected page and action |
| Brute-force protection | See below |
| Sign out | `signOut()` ends this browser's session (see below) |

## Brute-force protection

Supabase Auth rate-limits sign-in by IP address: by default 150 requests per
5 minutes with bursts of 30, answered with **429** (`over_request_rate_limit`,
shown to the user as "Too many attempts"). We deliberately **don't** build a
per-account lockout ("5 wrong passwords locks the account"): it would let
anyone lock a victim out just by typing their email.

Recommended dashboard settings (Authentication → Rate Limits and Bot and Abuse
Protection):

1. Check **Sign-ups and sign-ins** is the default or lower.
2. Turn on **CAPTCHA protection** (hCaptcha or Cloudflare Turnstile). Supabase
   then rejects sign-in attempts that lack a valid token. The action already
   passes through a `captchaToken` form field (also `cf-turnstile-response` or
   `h-captcha-response`), so the frontend only needs to render the widget.
   Without a token Supabase answers `captcha_failed`, shown as "We couldn't
   confirm you're not a robot."
3. Turn on **IP address forwarding** if the app sits behind a proxy or Vercel,
   so rate limits apply to the visitor's IP and not the server's.

Failed attempts are recorded in **Logs → Auth** in the dashboard; that is the
"monitoring" for now. Alerting on repeated failures is a follow-up.

## Remember Me and session policy

Supabase keeps users signed in with a long-lived refresh token in cookies. Its
default cookie lifetime is 400 days, which is too long for someone who didn't
tick Remember Me, so we set the lifetime ourselves (`withSessionLifetime()`):

| Remember Me | Cookie lifetime |
| --- | --- |
| Unticked | Ends when the browser closes |
| Ticked | 30 days since last use (renewed each time the session is refreshed) |

The choice is stored in a small `ep_remember` cookie so refreshes keep it.

Two limits worth knowing:
- The 30 days is a **cookie** limit. A stolen cookie file keeps working until
  Supabase's own session ends. To cap that server-side (Pro plan), set
  Authentication → Sessions → **Time-box user sessions** and **Inactivity
  timeout**.
- A signed-out browser's access token stays valid until it expires (1 hour by
  default). Lower **JWT expiry** for a stricter policy.

## Sign out

`signOut()` uses `scope: "local"`: it ends only this browser's session. The
Supabase default (`global`) would also sign the user out of their phone and
every other device, which people don't expect from a Sign Out button. (A
password reset still signs out every device.)

## Continue as Guest

Guest access is the public **`/demo`** page. It creates **no session** and reads
**no database tables**; it renders made-up data from `lib/demo/sample-data.ts`.
So a guest can't reach any organisation's private information, because there is
no route from the demo to it. A unit test fails if anything under `lib/demo`
imports Supabase.

Why not Supabase "anonymous sign-ins"? Those users get the same `authenticated`
database role as real accounts (so every `to authenticated` policy would apply
to them), and the endpoint lets anyone create database rows. Keep **Anonymous
sign-ins** switched **off** in the dashboard. As a safety net `requireUser()`
rejects any anonymous session, in case it is ever turned on.

## Not covered here

- **Google sign-in** is SCRUM-12.
- **Forgot Password** is SCRUM-11 (the link on the page is frontend work).
- **The sign-in page itself**: account-type selector, Remember Me checkbox,
  Continue as Guest button and the CAPTCHA widget are frontend work calling the
  actions above.
