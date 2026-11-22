# Team agreement

## Technology

The project uses Next.js with the App Router and TypeScript, Next.js server-side
functionality for the backend, Supabase for database and backend services, and
Tailwind CSS for styling. The shared runtime is Node.js 26 or newer, and the
deployment provider is Vercel. Supabase credentials belong in environment
variables; service-role secrets must never reach client-side code.

## Coordination

The team coordinates through recurring sprint meetings. Jira is the source of
truth for project tasks, priorities, and progress. GitHub is the source of truth
for code, branches, commits, and pull requests. Reference Jira issue keys in
branch names and PR descriptions.

## Git and pull requests

`main` is production-ready; `development` is the shared integration branch.
Create task branches from `development` using
`<jira-issue-key>/<type>/<description>`, and open their PRs against
`development`. Changes reach `main` through an intentional release or merge from
`development`.

Keep PRs focused and aim for approximately 50-150 changed lines when practical.
Explain what changed and why, avoid unrelated changes, and address feedback.
Every PR requires approval from two human reviewers.

## Definition of Done

- The Jira issue's acceptance criteria are met.
- Relevant tests are added or updated and pass.
- Two human reviewers have reviewed and approved the implementation.
- Documentation is updated when the change requires it.
- No known regressions or breakage of existing functionality are introduced.

## AI usage

AI-assisted development is permitted. Developers remain responsible for their
submitted code and must understand, be able to explain, and take ownership of
their contributions. AI-generated code must satisfy the same testing, review,
and quality standards as other code.

See [CONTRIBUTING.md](../CONTRIBUTING.md) and the
[development workflow](./development_workflow.md) for practical instructions.
