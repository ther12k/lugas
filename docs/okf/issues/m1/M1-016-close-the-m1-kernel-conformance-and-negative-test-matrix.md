---
type: GitHub Issue
title: M1-016 — Close the M1 kernel conformance and negative-test matrix
status: draft
tags:
- github-issue
- m1
- testing
- test
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M1-016
  milestone: M1
  milestone_title: M1 — Bun-Native Kernel
  status: backlog
  priority: P0
  size: L
  area: testing
  kind: test
  global_wave: 13
  milestone_wave: 7
  depends_on:
  - M1-002
  - M1-003
  - M1-004
  - M1-005
  - M1-006
  - M1-008
  - M1-009
  - M1-011
  - M1-012
  - M1-013
  - M1-014
  - M1-015
  blocks:
  - M1-GATE
  conflict_group: m1-test-closure
  owner_decision: false
  recommended_branch: agent/M1-016-close-the-m1-kernel-conformance-and-negative-tes
  recommended_worktree: .worktrees/M1-016
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
---

# M1-016 — Close the M1 kernel conformance and negative-test matrix

## Outcome

Provide an independent test layer proving the kernel contract and native pass-through boundaries.

## Why this task exists

This task is a bounded unit in **M1 — Bun-Native Kernel**. It unlocks **[M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Testing Interface](../../architecture/testing-interface.md)
- [Testing Strategy](../../engineering/testing-strategy.md)
- [Conformance Matrix](../../engineering/conformance-matrix.md)

## Dependency contract

- **Depends on:** [M1-002](M1-002-implement-typed-response-branding-and-json.md), [M1-003](M1-003-implement-text-empty-problem-and-redirect.md), [M1-004](M1-004-implement-the-route-descriptor-factory-and-local-invariants.md), [M1-005](M1-005-implement-named-guard-descriptors-and-metadata.md), [M1-006](M1-006-implement-named-module-route-containers.md), [M1-008](M1-008-classify-and-preserve-native-bun-route-entries.md), [M1-009](M1-009-compile-lugas-descriptors-into-bun-handlers.md), [M1-011](M1-011-implement-services-and-base-request-context-typing.md), [M1-012](M1-012-reject-duplicate-routes-and-module-ownership-conflicts.md), [M1-013](M1-013-validate-route-path-and-params-declaration-consistency.md), [M1-014](M1-014-implement-default-not-found-and-unexpected-error-policies.md), [M1-015](M1-015-implement-app-serve-and-safe-bun-option-passthrough.md)
- **Blocks:** [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md)
- **Global wave:** 13
- **Milestone wave:** 7
- **Conflict group:** `m1-test-closure`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Map all M1 requirements to unit, integration, type, conformance, and security tests.
- Add missing negative cases without changing production semantics.
- Run repeated server lifecycle and concurrent plain-route tests.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
tests/m1/**
docs/reports/m1-kernel-conformance.md
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
git worktree add ".worktrees/M1-016" -b "agent/M1-016-close-the-m1-kernel-conformance-and-negative-tes" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Map all M1 requirements to unit, integration, type, conformance, and security tests.
5. Implement: Add missing negative cases without changing production semantics.
6. Implement: Run repeated server lifecycle and concurrent plain-route tests.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M1-016.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Every M1 acceptance criterion has a test/evidence link.
- [ ] Raw Bun pass-through matrix remains green.
- [ ] No leaked server or unhandled rejection occurs in repeated runs.
- [ ] Tests use public API for integration fixtures.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M1-016.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run test:m1
bun run verify
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M1-016.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
