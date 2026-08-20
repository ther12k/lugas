---
type: GitHub Issue
title: M0-002 — Create the repository skeleton and ownership boundaries
status: draft
tags:
- github-issue
- m0
- architecture
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M0-002
  milestone: M0
  milestone_title: M0 — Design Freeze and Baselines
  status: backlog
  priority: P0
  size: M
  area: architecture
  kind: implementation
  global_wave: 2
  milestone_wave: 2
  depends_on:
  - M0-001
  blocks:
  - M0-003
  - M0-004
  - M0-005
  - M0-011
  - M0-GATE
  conflict_group: repo-scaffold
  owner_decision: false
  recommended_branch: agent/M0-002-create-the-repository-skeleton-and-ownership-bou
  recommended_worktree: .worktrees/M0-002
  labels:
  - type:implementation
  - area:architecture
  - priority:p0
  - size:m
---

# M0-002 — Create the repository skeleton and ownership boundaries

## Outcome

Create the smallest repository structure needed for M0/M1 with public, internal, test, benchmark, example, and evidence boundaries.

## Why this task exists

This task is a bounded unit in **M0 — Design Freeze and Baselines**. It unlocks **[M0-003](M0-003-pin-bun-typescript-and-the-deterministic-toolchain.md), [M0-004](M0-004-establish-ci-skeleton-and-one-verification-command.md), [M0-005](M0-005-implement-the-okf-link-and-issue-dependency-validator.md), [M0-011](M0-011-install-contribution-and-subagent-worktree-guards.md), [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Charter](../../project/charter.md)
- [Principles](../../project/principles.md)
- [Overview](../../architecture/overview.md)

## Dependency contract

- **Depends on:** [M0-001](M0-001-freeze-the-design-baseline-and-decision-registry.md)
- **Blocks:** [M0-003](M0-003-pin-bun-typescript-and-the-deterministic-toolchain.md), [M0-004](M0-004-establish-ci-skeleton-and-one-verification-command.md), [M0-005](M0-005-implement-the-okf-link-and-issue-dependency-validator.md), [M0-011](M0-011-install-contribution-and-subagent-worktree-guards.md), [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md)
- **Global wave:** 2
- **Milestone wave:** 2
- **Conflict group:** `repo-scaffold`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Create only directories with an immediate M0/M1 purpose.
- Add ignore rules for worktrees, build output, coverage, raw benchmark artifacts, and secrets.
- Document public export hotspots and worktree ownership zones.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
.gitignore
src/**/.gitkeep
tests/**/.gitkeep
benchmarks/**/.gitkeep
examples/**/.gitkeep
docs/repository-layout.md
```

The paths are the expected ownership boundary. Small adjacent test fixtures may be added when necessary, but shared-file changes require dispatcher/integrator approval and must be recorded in evidence.

## Protected shared files

```text
package.json (unless explicitly owned)
bun.lock (unless explicitly owned)
src/index.ts / src/client/index.ts / src/testing/index.ts (unless explicitly owned)
.github/workflows/** (unless explicitly owned)
docs/okf/delivery/backlog.md and issue-index.md
```

## Recommended worktree

```bash
git fetch --all --prune
git worktree add ".worktrees/M0-002" -b "agent/M0-002-create-the-repository-skeleton-and-ownership-bou" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Create only directories with an immediate M0/M1 purpose.
5. Implement: Add ignore rules for worktrees, build output, coverage, raw benchmark artifacts, and secrets.
6. Implement: Document public export hotspots and worktree ownership zones.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M0-002.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] A clean checkout has no placeholder runtime modules masquerading as implementation.
- [ ] Examples cannot import `src/internal/**` by intended layout.
- [ ] Shared files listed in AGENTS are identifiable and reserved for integrator tasks.
- [ ] The repository can hold one worktree per issue without nested-worktree pollution.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M0-002.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
git status --short
find . -maxdepth 3 -type f | sort
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M0-002.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

## Integration and merge notes

- Merge only after all dependencies are on the target branch.
- Rebase/update from the dependency-complete base before final CI.
- Preserve existing tests and evidence when resolving conflicts.
- The designated shared-file integrator performs exports, lockfile, and central-index edits not owned here.
- A failed acceptance criterion creates a correction/blocker issue; do not weaken the criterion silently.

## Rollback and recovery

The change must be revertible as one task without removing dependency evidence from other issues. For a failed spike or gate, retain the report, mark the outcome accurately, and stop downstream dispatch until the decision/correction is merged.

## Agent stop point

Stop when this issue's acceptance and evidence are complete. Do not begin any issue listed under **Blocks** in this worktree.
