---
type: GitHub Issue
title: M1-005 — Implement named guard descriptors and metadata
status: draft
tags:
- github-issue
- m1
- guards
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M1-005
  milestone: M1
  milestone_title: M1 — Bun-Native Kernel
  status: backlog
  priority: P0
  size: M
  area: guards
  kind: implementation
  global_wave: 8
  milestone_wave: 2
  depends_on:
  - M1-001
  blocks:
  - M1-007
  - M1-016
  - M1-018
  - M1-GATE
  - M2-010
  conflict_group: guards
  owner_decision: false
  recommended_branch: agent/M1-005-implement-named-guard-descriptors-and-metadata
  recommended_worktree: .worktrees/M1-005
  labels:
  - type:implementation
  - area:guards
  - priority:p0
  - size:m
---

# M1-005 — Implement named guard descriptors and metadata

## Outcome

Create immutable named guards whose result contract can enrich context or stop with a response.

## Why this task exists

This task is a bounded unit in **M1 — Bun-Native Kernel**. It unlocks **[M1-007](M1-007-implement-the-defineapp-validation-and-composition-shell.md), [M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-018](M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M2-010](../m2/M2-010-execute-guards-with-sync-path-and-response-short-circuit.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Lifecycle And Guards](../../architecture/lifecycle-and-guards.md)
- [Request Context](../../architecture/request-context.md)
- [0011 Explicit Services Guard Enrichment](../../decisions/0011-explicit-services-guard-enrichment.md)

## Dependency contract

- **Depends on:** [M1-001](M1-001-create-the-core-public-and-internal-type-skeleton.md)
- **Blocks:** [M1-007](M1-007-implement-the-defineapp-validation-and-composition-shell.md), [M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-018](M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M2-010](../m2/M2-010-execute-guards-with-sync-path-and-response-short-circuit.md)
- **Global wave:** 8
- **Milestone wave:** 2
- **Conflict group:** `guards`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Implement `guard()` branding and stable name validation.
- Type valid enrichment/response/promise outputs and reject `undefined`/primitive continuation.
- Preserve guard identity for manifest and diagnostics.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/core/guard.ts
tests/unit/guard-descriptor.test.ts
tests/types/guard-descriptor.test-d.ts
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
git worktree add ".worktrees/M1-005" -b "agent/M1-005-implement-named-guard-descriptors-and-metadata" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Implement `guard()` branding and stable name validation.
5. Implement: Type valid enrichment/response/promise outputs and reject `undefined`/primitive continuation.
6. Implement: Preserve guard identity for manifest and diagnostics.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M1-005.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Empty, duplicate-form, or invalid names fail with stable local diagnostics/types.
- [ ] Enrichment keys are readonly in the inferred result.
- [ ] Typed response union is extractable.
- [ ] No guard execution occurs during declaration.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M1-005.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/unit/guard-descriptor.test.ts
bun run test:types
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M1-005.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
