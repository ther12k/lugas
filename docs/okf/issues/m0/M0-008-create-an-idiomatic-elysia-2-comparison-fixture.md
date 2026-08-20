---
type: GitHub Issue
title: M0-008 — Create an idiomatic Elysia 2 comparison fixture
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
  id: M0-008
  milestone: M0
  milestone_title: M0 — Design Freeze and Baselines
  status: backlog
  priority: P1
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
  conflict_group: shared-package
  owner_decision: false
  recommended_branch: agent/M0-008-create-an-idiomatic-elysia-2-comparison-fixture
  recommended_worktree: .worktrees/M0-008
  labels:
  - type:benchmark
  - area:performance
  - priority:p1
  - size:m
---

# M0-008 — Create an idiomatic Elysia 2 comparison fixture

## Outcome

Prepare a fair Elysia comparison fixture for later evidence without importing Elysia into Lugas.

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
- **Conflict group:** `shared-package`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Pin an Elysia 2 beta version compatible with the Bun baseline.
- Implement the same controlled endpoints idiomatically using Elysia schemas/guards where applicable.
- Record version coupling, build mode, and feature-equivalence notes.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
benchmarks/elysia/**
docs/reports/m0-elysia-fixture.md
package.json
bun.lock
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
git worktree add ".worktrees/M0-008" -b "agent/M0-008-create-an-idiomatic-elysia-2-comparison-fixture" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Pin an Elysia 2 beta version compatible with the Bun baseline.
5. Implement: Implement the same controlled endpoints idiomatically using Elysia schemas/guards where applicable.
6. Implement: Record version coupling, build mode, and feature-equivalence notes.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M0-008.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Fixture behavior matches the defined baseline payload/status/header contract.
- [ ] Elysia is isolated to benchmark/dev dependencies.
- [ ] No intentionally non-idiomatic middleware or debug setting disadvantages the fixture.
- [ ] The report states that Elysia beta behavior may change.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M0-008.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run bench:elysia:smoke
bun test benchmarks/elysia/**/*.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M0-008.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
