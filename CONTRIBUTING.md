# Contributing to LugasJS

One issue, one worktree, one atomic PR, one evidence report.

1. Start from latest `main`.
2. Use `.worktrees/<ISSUE-ID>` and branch `agent/<ISSUE-ID>-<slug>`.
3. Change only issue-owned files; shared hotspots require explicit ownership.
4. Add negative tests and record exact commands/results in `docs/reports/issues/<ISSUE-ID>.md`.
5. PR title starts with stable issue ID and body links `Closes #<number>`.
6. Do not publish packages, change license, or make public performance claims without owner/gate approval.
