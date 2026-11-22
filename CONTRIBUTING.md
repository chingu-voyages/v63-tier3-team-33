# Contributing

## Getting started

Follow the [README](./README.md) for access and local setup. Jira is the source
of truth for tasks, priorities, and progress; GitHub is the source of truth for
code, branches, commits, and pull requests. Select or receive a Jira issue and
understand its acceptance criteria before starting.

The shared `development` branch must be published before the remote commands
below will work. The current `main` baseline has no runnable application; see
the README for the existing scaffold's status.

## Branching

- `main` contains production-ready code.
- `development` is the shared integration branch.
- Create feature and task branches from an up-to-date `development` branch.
- Open task pull requests against `development`. Changes reach `main` through
  an intentional release or merge from `development`.

```sh
git fetch origin
git switch development
git pull --ff-only origin development
git switch -c EVP-12/feature/create-event
```

Name branches `<jira-issue-key>/<type>/<description>`. Common types are
`feature`, `fix`, `docs`, `test`, `refactor`, and `chore`. For example:

- `EVP-12/feature/create-event`
- `EVP-18/fix/event-validation`
- `EVP-24/docs/update-readme`
- `EVP-31/test/add-event-tests`

Use concise, descriptive commit messages explaining the change. Reference the
Jira issue key when useful; do not include credentials or unrelated work.

## Pull requests and reviews

Keep PRs small and focused, aiming for approximately 50-150 changed lines when
practical. Explain what changed and why, reference the Jira issue in the PR
description, and complete the PR template. Review your own diff before requesting
review; include relevant test results and screenshots or recordings when useful.
Avoid unrelated changes.

Each PR requires approval from two human reviewers. Respond to feedback and
resolve review concerns before merging. See the
[development workflow](./docs/development-workflow.md) for the full sequence.

## Definition of Done

- The Jira issue's acceptance criteria are met.
- Relevant tests are added or updated and pass.
- Two human reviewers have reviewed and approved the implementation.
- Documentation is updated when the change requires it.
- The change introduces no known regressions or breakage of existing functionality.

## Testing

Run the relevant checks and tests for the affected behavior, including regression
tests where appropriate. Report what passed and any checks that could not be run
in the PR. The current `main` baseline has no application scripts or test suite;
use the scripts and testing instructions available on your working branch.

## AI-assisted development

AI assistance is permitted, but developers remain responsible for every
contribution. Understand, be able to explain, and take ownership of submitted
changes. AI-generated code must meet the same testing, review, and quality
standards as any other code.
