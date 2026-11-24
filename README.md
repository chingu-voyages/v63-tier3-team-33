# Event Planner

Event Planner is a Chingu Voyage project intended to help people plan events.
The team is establishing the development foundation; no application functionality
is available on `main` yet.

## Technology stack

- Next.js with the App Router and TypeScript
- Next.js server-side functionality for the backend
- Supabase for the database and backend services
- Tailwind CSS for styling
- Jira for planning and GitHub for code collaboration

The deployment provider is Vercel.

## Current status

The current `main` branch contains documentation, not an initialized application.
An existing `scaffold-next-js` branch contains a Next.js scaffold with an npm
lockfile and `dev`, `build`, `start`, and `lint` scripts; it has not been merged
into `main`. Coordinate its review and integration through `development` rather
than recreating it. The shared baseline requires Node.js 26 or newer.

## Prerequisites

- Git and access to this GitHub repository
- Access to the team's Jira workspace
- Node.js 26 or newer and npm for the application once the scaffold is
  integrated
- Access to the team's Supabase configuration when integration is ready

## Local setup

1. Clone the repository:
   ```sh
   git clone https://github.com/chingu-voyages/v63-tier3-team-33.git
   cd v63-tier3-team-33
   ```
2. Once the team has published the shared `development` branch, fetch it and
   check it out:
   ```sh
   git fetch origin
   git switch --track origin/development
   ```
   Until then, coordinate with the team before starting shared integration work.
3. Follow [CONTRIBUTING.md](./CONTRIBUTING.md) to select a Jira task and
   create a task branch.

### Supabase and environment variables

There are no required environment variables on the current baseline.
[.env.example](./.env.example) is a placeholder for variables introduced by the
Supabase integration; do not put credentials in it. Once that integration is
available, copy the example to `.env.local` and fill in the documented values
from the team's existing Supabase project or an agreed local Supabase instance.
Use the Supabase project dashboard for project URL and appropriate keys, or the
local Supabase CLI output when using a configured local instance. Setting up a
local instance requires the Supabase CLI, a compatible container runtime, and
project configuration; these are not yet present in this baseline.

Never commit `.env.local` or share real credentials. Public client configuration
is not secret; keep any service-role key exclusively in server-side environment
variables and never expose it to client-side code.

## Development commands

There are no runnable application scripts on `main` yet. The scaffold's npm
lockfile and scripts provide the following commands once it is reviewed and
integrated:

```sh
npm ci          # Install dependencies from the lockfile
npm run dev     # Start the development server
npm run lint    # Run ESLint
npm run build   # Build for production
npm start       # Start the production build
```

These commands have not been verified on the current baseline, which has no
application test suite or development server.

## Team documents

- [Contribution guidelines](./CONTRIBUTING.md)
- [Development workflow](./docs/development_workflow.md)
- [Team agreement](./docs/team_agreement.md)
- [Decision log](./docs/team_decision_log.md)
- [Meeting templates](./docs)

## Our Team

- Teammate name: Djombissi Mintsa Steve Daniels / [Github.com/DMSD/003](https://github.com/DMSD003) 
- Teammate name: Mikey Nichols / [mnichols08](https://github.com/mnichols08) / [LinkedIn](https://linkedin.com/in/mnix-dev)
- Teammate name: Nadiia Lashtun / [GitHub](https://github.com/NadiiaLashtun) / [LinkedIn](https://www.linkedin.com/in/lashtun)
- Teammate name #n: [GitHub](https://github.com/ghaccountname) / [LinkedIn](https://linkedin.com/in/liaccountname)
