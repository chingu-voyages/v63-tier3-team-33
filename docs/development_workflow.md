# Development workflow

Jira tracks tasks, priorities, and progress. GitHub tracks code, branches,
commits, and pull requests. Coordinate through recurring sprint meetings.

1. Select or receive a Jira issue.
2. Understand its acceptance criteria and clarify uncertainties with the team.
3. Update `development` and create a branch from it named
   `<jira-issue-key>/<type>/<description>`.
4. Implement the focused change and review your own diff.
5. Run relevant checks and tests; add or update tests as appropriate.
6. Open a PR against `development`, explaining what changed and why, and
   referencing the Jira issue in the description. Include testing results and
   relevant screenshots or recordings.
7. Obtain approval from two human reviewers.
8. Address feedback, confirm the Definition of Done, and merge when approved.

Aim for approximately 50-150 changed lines per PR when practical, and avoid
unrelated changes. Changes reach `main` through an intentional release or merge
from `development`.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for commands, review requirements,
testing expectations, and the Definition of Done.