## Finalized

| Area | Decision |
| --- | --- |
| Project | Event Planner |
| Planning | Jira is the source of truth for tasks, priorities, and progress. |
| Code collaboration | GitHub is the source of truth for code, branches, commits, and PRs. |
| Framework and language | Next.js App Router with TypeScript. |
| Runtime | Node.js 26 or newer. |
| Backend | Next.js server-side functionality; no separate Express server. |
| Database and backend services | Use the team's Supabase project shared via Discord; credentials belong in environment variables, with service-role secrets server-side only. |
| Styling | Tailwind CSS. |
| Deployment | Vercel. |
| Branching | `main` is production-ready; `development` is the integration branch. Task branches start from and target `development`; releases reach `main` intentionally from `development`. |
| Branch names | `<jira-issue-key>/<type>/<description>`; common types are `feature`, `fix`, `docs`, `test`, `refactor`, and `chore`. |
| Pull requests | Small and focused, approximately 50-150 changed lines when practical; explain what and why, reference Jira, avoid unrelated changes, and address feedback. |
| Review | Two human reviewers approve each PR. |
| Definition of Done | Meet Jira acceptance criteria; add or update and pass relevant tests; obtain two human reviews; update documentation when needed; introduce no known regressions or breakage. |
| Coordination | Weekly meeting Tuesday/Wednesday, 1:00–2:00 PM EST (18:00–19:00 UTC). |
| Authentication | Supabase Auth (email + password, 6-digit email OTP verification). Roles (`admin`/`manager`/`guest`) live in `public.profiles` protected by RLS; `admin` is granted only via SQL, never at sign-up. Transactional email sent by Brevo via Supabase custom SMTP (no email SDK in the app). See [auth setup](./auth_setup.md). |
| AI assistance | Permitted with developer ownership and understanding; normal review, testing, and quality standards still apply. |
