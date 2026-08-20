---
type: Engineering Standard
title: Parallel Subagent and Worktree Execution Protocol
status: draft
tags:
- subagents
- worktree
- parallel
- integration
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Parallel Subagent and Worktree Execution Protocol

## Roles

- **Dispatcher:** selects ready issues, verifies dependencies and file conflicts, creates worktrees.
- **Task agent:** implements exactly one issue and produces evidence.
- **Integrator:** owns shared exports/configuration and merges in dependency order.
- **Gate reviewer:** independently verifies milestone evidence and opens corrections rather than patching child work silently.
- **Owner:** decides irreversible publication, naming assets, license, governance, and scope exceptions.

One person or agent may hold multiple roles sequentially, but not review its own gate without independent verification where feasible.

## Readiness algorithm

An issue is ready when:

1. all `depends_on` issues are merged;
2. its milestone gate predecessor is merged;
3. no active worktree owns overlapping mutable files;
4. required owner decisions are resolved;
5. source docs and acceptance criteria are current;
6. CI is green on the base commit.

## Worktree setup

```bash
git fetch --all --prune
git worktree add ".worktrees/M2-010" -b "agent/M2-010-guard-execution" <base-branch>
```

The task agent records the base commit in evidence before editing.

## Conflict control

- Dispatcher maintains active ownership outside source-controlled central docs, preferably GitHub Project/issue fields.
- Same-wave issues still cannot run concurrently when owned files overlap.
- Shared exports, lockfile, CI, and central indexes are changed only by dedicated integrator issues.
- If an unexpected shared edit is necessary, stop and request ownership transfer or split the integration; do not race another worktree.

## Task completion

The agent:

- runs issue verification;
- writes `docs/reports/issues/<ID>.md`;
- links tests to acceptance criteria;
- leaves no untracked build artifacts;
- opens a PR with `Closes #...` and dependency/evidence links;
- does not merge its own PR unless repository policy permits and independent checks pass.

## Rebase and merge

Rebase or update from the latest dependency-complete base before final CI. Resolve conflicts by preserving both task contracts; never discard another task's tests without review. Gate issues merge only after all required task PRs and correction issues are closed.

## Failure recovery

When a task fails:

- preserve useful spike/evidence commits if reviewable;
- document why acceptance failed;
- return the issue to blocked/needs-design;
- open a smaller correction or ADR issue;
- remove the worktree only after commits/evidence are safely referenced.
