# Google sign-in setup

Supabase Auth runs the OAuth 2.0 / OpenID Connect exchange with Google. We never
see or store a Google password. The app only starts the flow
(`app/(auth)/google-actions.ts`) and finishes it at `/auth/callback`
(`app/auth/callback/route.ts`).

```
Continue with Google ──signInWithOAuth()──► Google account chooser
   ▼                                          (Google redirects to Supabase)
Supabase validates Google's response, creates or links the user
   ▼
/auth/callback?code=… ──exchangeCodeForSession()──► session cookie
   ├─ new Google user (role_chosen = false) ──► /choose-account-type ──► role home
   ├─ returning user ──► their existing role's home (role never changed here)
   └─ ?error=… ──► /sign-in?oauth_error=<key> with a friendly message
```

## One-time setup

1. **Run the migration** `supabase/migrations/20261128000000_google_profiles.sql`
   (SQL Editor). It adds `avatar_url` and `role_chosen` to `profiles` and
   `choose_account_type()`.
2. **Google Cloud Console** → Google Auth Platform:
   - **Clients → Create client → Web application.**
   - **Authorized redirect URI:** your Supabase callback, shown in the Supabase
     dashboard (Authentication → Sign In / Providers → Google). It looks like
     `https://<project-ref>.supabase.co/auth/v1/callback`.
   - **Data Access (scopes):** `openid`, `.../auth/userinfo.email`,
     `.../auth/userinfo.profile`. Add nothing else.
   - Copy the **Client ID** and **Client secret**.
3. **Supabase dashboard** → Authentication → Sign In / Providers → **Google**:
   enable it and paste the Client ID and secret.
4. **Supabase dashboard** → Authentication → URL Configuration:
   - **Site URL:** the app's public URL.
   - **Redirect URLs:** add `<app URL>/auth/callback` (and
     `http://localhost:3000/auth/callback` for local development).
5. **Optional:** set `NEXT_PUBLIC_SITE_URL` (for example in Vercel) so the
   callback URL doesn't depend on request headers. Without it, the app uses
   the request's own host.

The Google client secret goes only in the Supabase dashboard. Never put it in
the repo or `.env`.

## Who handles each requirement

| Requirement | How |
| --- | --- |
| No Google password collected or stored | Google's own consent screen; Supabase only receives tokens |
| Response validated | `exchangeCodeForSession()` accepts only an unused, unexpired code tied to this browser's PKCE cookie |
| Name, email, picture, Google ID | Stored by Supabase on the user and identity; name and an https-only picture are copied to `profiles` |
| Unverified Google email | Supabase refuses to sign the user in and returns `provider_email_needs_verification` |
| No duplicate accounts | One user per verified email: a Google login with the same verified email as an existing account is **linked** to it, not duplicated |
| Existing role preserved | The callback never writes a role. Only `choose_account_type()` can, once, and only while `role_chosen` is false |
| Nobody can pick admin | Rejected in the form action, in the database function, and by the trigger |
| Open redirects | `safeNextPath()` only allows same-site paths |
| Roles apply to Google users | `requireUser()` reads `profiles`, exactly as for email users |

## Account linking and takeover protection

- **Same verified email:** Supabase links the Google identity to the existing
  user automatically. Event records, registrations and the role are untouched
  because the user row and `profiles` row are the same.
- **Existing email/password account that was never verified:** Supabase removes
  that account's unverified identities and password when a verified Google
  login takes over the email. This stops someone pre-registering a victim's
  address and keeping access after the real owner signs in with Google.
- **Known quirk:** in that last case the `profiles` row survives, including the
  role the pre-registrant picked. The real owner keeps that role and skips the
  account-type step. It can be changed by an admin; see the open questions in
  the PR.
- **Manual linking** (a signed-in user adding Google with a different email) is
  off by default (`enable_manual_linking`) and isn't part of this change.

## Local development

Local Supabase needs a Google client of its own. In `supabase/config.jsonc`
(see the local-config PR) enable `auth.external.google`, set `client_id`, put
the secret in an environment variable, and set `skip_nonce_check` to `true`
(Google's local flow requires it). Add the **local** callback
(`http://127.0.0.1:54321/auth/v1/callback`) as a redirect URI on a Google
client used only for development.
