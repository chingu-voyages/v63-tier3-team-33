# Auth setup: sign-up, email verification and roles

Supabase Auth does the heavy lifting (password hashing, OTP generation,
expiry, invalidating old codes and rate limiting). Brevo delivers the
emails over SMTP. The app only adds forms, Server Actions and a
`profiles` table for roles. **No email SDK or OTP code lives in this repo.**

## How the flow works

```
/sign-up ──signUp()──► Supabase creates user (unverified) + emails a code via Brevo
   │                    DB trigger creates public.profiles row (role)
   ▼
/verify-email ──verifyOtp()──► email confirmed, session cookie set
   │   └─ "resend code" ──resend()──► new code; the old one stops working
   ▼
manager → /onboarding/organisation      guest, admin → /dashboard
```

## Roles

| Role | Who | Can do | How they get it |
| --- | --- | --- | --- |
| `admin` | Platform staff | Everything: any event, and user CRUD (read, update, delete any profile, change roles) | **Only** granted by SQL, never at sign-up |
| `manager` | Event creators | Create, read, update and delete **their own** events, including inviting guests | Picks "Event Creator" at sign-up |
| `guest` | Attendees | Read events they're invited to and edit **their own** RSVP | Picks "Guest" at sign-up (the default) |

Roles live in `public.profiles.role`, protected by Row Level Security. Users
can't change their own role; only admins can. A forged `admin` in sign-up data
is turned into `guest` by the database trigger.

This ticket creates the roles and the helpers that enforce them:
`public.is_admin()` / `public.has_role()` in SQL, and `requireUser(...roles)`
in the app. The event and RSVP tables (and their "own event" / "own RSVP" RLS
policies) come with the event tickets and should use those helpers, e.g.:

```sql
-- managers manage their own events; admins manage all
create policy "Managers manage own events" on public.events for all to authenticated
  using ((select auth.uid()) = created_by or (select public.is_admin()))
  with check ((select auth.uid()) = created_by or (select public.is_admin()));
```

### Making someone an admin

Run in the Supabase SQL Editor (it runs as the service role, so RLS doesn't block it):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'person@example.com');
```

The new role takes effect on that user's next page load.

| File | Purpose |
| --- | --- |
| `lib/auth/rules.ts` | Pure validation, error messages and routing rules (unit tested) |
| `app/(auth)/actions.ts` | Server Actions: sign up, verify, resend, sign in, sign out |
| `lib/auth/session.ts` | `requireUser(...roles)`: use in every protected page/action |
| `lib/auth/pending-verification.ts` | httpOnly cookie: which email awaits a code and when it was sent |
| `proxy.ts` | Refreshes sessions and bounces signed-out users from protected routes |
| `supabase/migrations/*_create_profiles.sql` | `profiles` table, roles, `is_admin()`/`has_role()`, signup trigger, RLS |

**Unverified users can't get in:** Supabase doesn't issue a session until the
code is verified, and every protected page calls `requireUser()`.

## One-time project setup (dashboard)

Do these once in the shared Supabase project. Each is required.

1. **Run the migration.** SQL Editor → paste
   `supabase/migrations/20261127000000_create_profiles.sql` → Run.
   (Or `supabase db push` if you use the CLI.)
2. **Require verification.** Authentication → Sign In / Providers → Email:
   - **Confirm email**: ON
   - **Email OTP Expiration**: `600` seconds. Must match
     `OTP_EXPIRY_SECONDS` in `lib/auth/rules.ts`.
   - **Email OTP Length**: `6`
   - **Minimum password length**: `8` (matches `PASSWORD_MIN_LENGTH`).
3. **Send a code instead of a link.** Authentication → Emails → Templates →
   **Confirm signup**. Replace the body so it shows `{{ .Token }}`, e.g.:

   ```html
   <h2 style="color:#6d28d9">Verify your EventPlanner email</h2>
   <p>Your verification code is:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>It expires in 10 minutes. If you didn't sign up, ignore this email.</p>
   ```

   Codes also survive corporate link scanners, which can use up magic links before the user clicks them.

   Do the same for **Reset Password** (used by Forgot Password):

   ```html
   <h2 style="color:#6d28d9">Reset your EventPlanner password</h2>
   <p>Your verification code is:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>It expires in 10 minutes. If you didn't ask to reset your password, ignore this email; your password won't change.</p>
   ```

   Don't include `{{ .Email }}` or a link that signs the user in; the code is enough.
4. **Connect Brevo SMTP.** In Brevo: Settings → SMTP & API → SMTP → generate an
   SMTP key, and verify the sender domain (DKIM/DMARC). Then in Supabase:
   Authentication → Emails → SMTP Settings → enable custom SMTP:

   | Field | Value |
   | --- | --- |
   | Host | `smtp-relay.brevo.com` |
   | Port | `587` |
   | Username | The SMTP **login** shown on Brevo's SMTP page |
   | Password | The SMTP **key** (not your Brevo password or API key) |
   | Sender email / name | A verified Brevo sender, e.g. `no-reply@yourdomain` / `EventPlanner` |

   Without this, Supabase's built-in mailer only sends to project team members
   and is limited to a few emails per hour.
5. **Rate limits.** Authentication → Rate Limits: once custom SMTP is on, set
   the email limit to suit Brevo's plan (free tier: 300/day). The per-address
   resend interval (60s) is what the UI countdown mirrors
   (`RESEND_COOLDOWN_SECONDS`).

## Forgot password

```
/forgot-password ──resetPasswordForEmail()──► "If an account exists, we've sent a code"
   ▼                                           (same message whether or not it exists)
/forgot-password/verify ──verifyOtp(type: "recovery")──► short-lived session
   │   └─ "resend code" ──resetPasswordForEmail()──► new code; the old one stops working
   ▼
/reset-password ──updateUser({ password })──► signed out everywhere ──► /sign-in?reset=1
```

Server actions: `app/(auth)/password-actions.ts`.

| Requirement | Who handles it |
| --- | --- |
| Don't reveal whether an account exists | Supabase returns success for unknown emails; we show one neutral message |
| Code is single-use and time-limited | Supabase deletes the code once verified; expiry from "Email OTP Expiration" |
| Rate limiting / resend | Supabase (60s per address); new code replaces the old one |
| Password hashed, old password invalid | Supabase (`updateUser`) |
| Other sessions invalidated | Supabase signs out every other session on password change; we then sign out the current one too |
| Only verified-code sessions can set a password | `canResetPassword()`: the session must have verified an emailed code in the last 15 minutes (`RESET_WINDOW_SECONDS`) |

**Unverified accounts:** if someone who never verified their sign-up uses
Forgot Password, verifying the reset code also confirms their email. Supabase
then clears any password set before confirmation, so they must choose a new one.
That's intended: the code proves they own the address.

## Local development

```sh
cp .env.example .env.local   # fill in URL + publishable key
npm run dev
npm test                     # unit tests (Node's built-in runner, no deps)
```

## Adding a protected page

1. Call `await requireUser()` (any signed-in user) or e.g.
   `requireUser("manager", "admin")` inside a component wrapped in
   `<Suspense>`. It reads cookies, which Cache Components requires to be inside
   a Suspense boundary. Admins are NOT allowed implicitly: list `"admin"` when
   they should have access.
2. Add the path to the `matcher` in `proxy.ts` so sessions are refreshed.
3. In Server Actions, call `requireUser()` again. Actions are public endpoints.

## Known limitations / follow-ups

- **Wrong vs. expired code:** Supabase returns one error code for both. We tell
  them apart using the time we sent the code. If the dashboard expiry changes,
  update `OTP_EXPIRY_SECONDS`.
- **Unverified sign-up again:** if someone signs up again with an email that was
  never verified, Supabase updates that pending account and sends a new code.
  This is intentional, so a typo'd or abandoned sign-up never blocks an address.
- **Access tokens outlive sign-out.** Signing out revokes refresh tokens, but an
  already-issued access token stays valid until it expires (1 hour by default).
  Lower "JWT expiry" in the dashboard if a stricter policy is needed.
- **Optional:** turn on Authentication → Emails → Notifications → "Password
  changed" so users are told when their password changes.
