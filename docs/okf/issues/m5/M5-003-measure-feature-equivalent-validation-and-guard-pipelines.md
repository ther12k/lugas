---
type: GitHub Issue
title: M5-003 — Measure feature-equivalent validation and guard pipelines
status: draft
tags:
- github-issue
- m5
- performance
- benchmark
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M5-003
  milestone: M5
  milestone_title: M5 — Hardening and Private Alpha
  status: backlog
  priority: P0
  size: L
  area: performance
  kind: benchmark
  global_wave: 39
  milestone_wave: 2
  depends_on:
  - M5-001
  - M2-GATE
  blocks:
  - M5-007
  - M5-017
  - M5-GATE
  conflict_group: benchmark-results
  owner_decision: false
  recommended_branch: agent/M5-003-measure-feature-equivalent-validation-and-guard-
  recommended_worktree: .worktrees/M5-003
  labels:
  - type:benchmark
  - area:performance
  - priority:p0
  - size:l
---

# M5-003 — Measure feature-equivalent validation and guard pipelines

## Outcome

Compare realistic validated/authenticated routes across raw Bun, Lugas, and Elysia without omitting equivalent work.

## Why this task exists

This task is a bounded unit in **M5 — Hardening and Private Alpha**. It unlocks **[M5-007](M5-007-install-performance-size-and-type-regression-gates.md), [M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Benchmark Methodology](../../engineering/benchmark-methodology.md)
- [Performance Budgets](../../engineering/performance-budgets.md)

## Dependency contract

- **Depends on:** [M5-001](M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md), [M2-GATE](../m2/M2-GATE-verify-validation-guards-security-and-context-contracts.md)
- **Blocks:** [M5-007](M5-007-install-performance-size-and-type-regression-gates.md), [M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md)
- **Global wave:** 39
- **Milestone wave:** 2
- **Conflict group:** `benchmark-results`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Use the same validator, payloads, auth service stub, status bodies, and success/failure mix.
- Measure sync and async guards/validators separately.
- Record parsing/validation allocation or heap indicators where available.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
benchmarks/raw-bun/validated/**
benchmarks/lugas/validated/**
benchmarks/elysia/validated/**
benchmarks/results/m5-validated/**
docs/reports/m5-validation-performance.md
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
git worktree add ".worktrees/M5-003" -b "agent/M5-003-measure-feature-equivalent-validation-and-guard-" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Use the same validator, payloads, auth service stub, status bodies, and success/failure mix.
5. Implement: Measure sync and async guards/validators separately.
6. Implement: Record parsing/validation allocation or heap indicators where available.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M5-003.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Comparator fixtures pass behavior equivalence tests first.
- [ ] Valid and invalid request mixes are both measured.
- [ ] Lugas unused-feature paths remain separate from validation paths.
- [ ] Report includes limitations of cross-framework schema implementation.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M5-003.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run benchmark:validated:release
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M5-003.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
