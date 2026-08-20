---
type: GitHub Issue
title: M5-007 — Install performance, size, and type regression gates
status: draft
tags:
- github-issue
- m5
- performance
- integration
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M5-007
  milestone: M5
  milestone_title: M5 — Hardening and Private Alpha
  status: backlog
  priority: P0
  size: L
  area: performance
  kind: integration
  global_wave: 40
  milestone_wave: 3
  depends_on:
  - M5-002
  - M5-003
  - M5-004
  - M5-005
  - M5-006
  blocks:
  - M5-017
  - M5-GATE
  conflict_group: shared-ci
  owner_decision: false
  recommended_branch: agent/M5-007-install-performance-size-and-type-regression-gat
  recommended_worktree: .worktrees/M5-007
  labels:
  - type:integration
  - area:performance
  - priority:p0
  - size:l
---

# M5-007 — Install performance, size, and type regression gates

## Outcome

Turn accepted evidence into transparent regression thresholds without pretending noisy PR runners are release hardware.

## Why this task exists

This task is a bounded unit in **M5 — Hardening and Private Alpha**. It unlocks **[M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Benchmark Methodology](../../engineering/benchmark-methodology.md)
- [Performance Budgets](../../engineering/performance-budgets.md)

## Dependency contract

- **Depends on:** [M5-002](M5-002-measure-raw-bun-versus-lugas-plain-route-overhead.md), [M5-003](M5-003-measure-feature-equivalent-validation-and-guard-pipelines.md), [M5-004](M5-004-measure-1-000-and-10-000-route-startup-and-memory.md), [M5-005](M5-005-measure-client-bundle-and-typescript-contract-cost.md), [M5-006](M5-006-integrate-bun-cpu-heap-and-metafile-diagnostics.md)
- **Blocks:** [M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md)
- **Global wave:** 40
- **Milestone wave:** 3
- **Conflict group:** `shared-ci`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Define controlled-release hard gates and PR smoke/alert thresholds separately.
- Store accepted baseline with environment and source commit.
- Require review for baseline updates.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
scripts/check-performance-budget.ts
benchmarks/baselines/**
.github/workflows/performance.yml
docs/performance-gates.md
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
git worktree add ".worktrees/M5-007" -b "agent/M5-007-install-performance-size-and-type-regression-gat" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Define controlled-release hard gates and PR smoke/alert thresholds separately.
5. Implement: Store accepted baseline with environment and source commit.
6. Implement: Require review for baseline updates.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M5-007.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] A synthetic severe regression fails the appropriate gate.
- [ ] Threshold updates cannot occur through benchmark code alone.
- [ ] Reports distinguish alert, target, and release-blocking thresholds.
- [ ] No single best sample is used as baseline.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M5-007.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run verify:performance-budget
bun run benchmark:smoke
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M5-007.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
