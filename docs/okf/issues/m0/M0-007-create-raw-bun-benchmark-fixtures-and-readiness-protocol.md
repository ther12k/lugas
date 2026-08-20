---
type: GitHub Issue
title: M0-007 — Create raw Bun benchmark fixtures and readiness protocol
status: draft
tags:
- github-issue
- m0
- performance
- benchmark
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M0-007
  milestone: M0
  milestone_title: M0 — Design Freeze and Baselines
  status: backlog
  priority: P0
  size: M
  area: performance
  kind: benchmark
  global_wave: 4
  milestone_wave: 4
  depends_on:
  - M0-003
  blocks:
  - M0-GATE
  - M5-001
  conflict_group: benchmark-harness
  owner_decision: false
  recommended_branch: agent/M0-007-create-raw-bun-benchmark-fixtures-and-readiness-
  recommended_worktree: .worktrees/M0-007
  labels:
  - type:benchmark
  - area:performance
  - priority:p0
  - size:m
---

# M0-007 — Create raw Bun benchmark fixtures and readiness protocol

## Outcome

Establish controlled raw Bun baseline applications before Lugas runtime code exists.

## Why this task exists

This task is a bounded unit in **M0 — Design Freeze and Baselines**. It unlocks **[M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md), [M5-001](../m5/M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Benchmark Methodology](../../engineering/benchmark-methodology.md)
- [Performance Budgets](../../engineering/performance-budgets.md)

## Dependency contract

- **Depends on:** [M0-003](M0-003-pin-bun-typescript-and-the-deterministic-toolchain.md)
- **Blocks:** [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md), [M5-001](../m5/M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md)
- **Global wave:** 4
- **Milestone wave:** 4
- **Conflict group:** `benchmark-harness`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Implement static, sync JSON, async, params, validation placeholder, and large-route fixtures.
- Add deterministic readiness signal and graceful shutdown.
- Capture environment/command metadata separately from results.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
benchmarks/raw-bun/**
scripts/bench/readiness.ts
docs/reports/m0-benchmark-fixtures.md
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
git worktree add ".worktrees/M0-007" -b "agent/M0-007-create-raw-bun-benchmark-fixtures-and-readiness-" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Implement static, sync JSON, async, params, validation placeholder, and large-route fixtures.
5. Implement: Add deterministic readiness signal and graceful shutdown.
6. Implement: Capture environment/command metadata separately from results.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M0-007.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Fixtures produce exact documented responses.
- [ ] Load generator can wait for readiness without arbitrary sleeps.
- [ ] 1,000 and 10,000 route variants are reproducible.
- [ ] No Lugas or Elysia code exists in the raw Bun baseline.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M0-007.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run bench:raw:smoke
bun test benchmarks/raw-bun/**/*.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M0-007.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
