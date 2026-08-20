---
type: GitHub Issue
title: M2-010 — Execute guards with sync path and response short-circuit
status: draft
tags:
- github-issue
- m2
- guards
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M2-010
  milestone: M2
  milestone_title: M2 — Validation and Guards
  status: backlog
  priority: P0
  size: L
  area: guards
  kind: implementation
  global_wave: 15
  milestone_wave: 1
  depends_on:
  - M1-GATE
  - M1-005
  - M1-009
  blocks:
  - M2-011
  - M2-012
  - M2-013
  - M2-GATE
  conflict_group: routing-compiler
  owner_decision: false
  recommended_branch: agent/M2-010-execute-guards-with-sync-path-and-response-short
  recommended_worktree: .worktrees/M2-010
  labels:
  - type:implementation
  - area:guards
  - priority:p0
  - size:l
---

# M2-010 — Execute guards with sync path and response short-circuit

## Outcome

Run ordered named guards inside compiled handlers and stop immediately on a native response.

## Why this task exists

This task is a bounded unit in **M2 — Validation and Guards**. It unlocks **[M2-011](M2-011-propagate-typed-guard-context-enrichment.md), [M2-012](M2-012-merge-guard-short-circuit-responses-into-route-contracts.md), [M2-013](M2-013-close-multi-guard-ordering-collision-and-failure-semantics.md), [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Lifecycle And Guards](../../architecture/lifecycle-and-guards.md)
- [Request Context](../../architecture/request-context.md)
- [0011 Explicit Services Guard Enrichment](../../decisions/0011-explicit-services-guard-enrichment.md)

## Dependency contract

- **Depends on:** [M1-GATE](../m1/M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M1-005](../m1/M1-005-implement-named-guard-descriptors-and-metadata.md), [M1-009](../m1/M1-009-compile-lugas-descriptors-into-bun-handlers.md)
- **Blocks:** [M2-011](M2-011-propagate-typed-guard-context-enrichment.md), [M2-012](M2-012-merge-guard-short-circuit-responses-into-route-contracts.md), [M2-013](M2-013-close-multi-guard-ordering-collision-and-failure-semantics.md), [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)
- **Global wave:** 15
- **Milestone wave:** 1
- **Conflict group:** `routing-compiler`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Compile guard sequence once per route.
- Preserve synchronous execution until a guard actually returns a promise.
- Verify response short-circuit skips later guards and handler.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/internal/run-guards.ts
src/internal/compile-route.ts
tests/integration/guard-execution.test.ts
tests/unit/guard-sync-path.test.ts
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
git worktree add ".worktrees/M2-010" -b "agent/M2-010-execute-guards-with-sync-path-and-response-short" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Compile guard sequence once per route.
5. Implement: Preserve synchronous execution until a guard actually returns a promise.
6. Implement: Verify response short-circuit skips later guards and handler.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M2-010.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Guards execute exactly once in declaration order.
- [ ] A returned response is sent unchanged.
- [ ] A thrown/rejected guard uses the unexpected-error policy, not continuation.
- [ ] Empty guard list adds no guard loop/allocation.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M2-010.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/integration/guard-execution.test.ts
bun test tests/unit/guard-sync-path.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M2-010.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
