---
type: GitHub Issue
title: M1-004 — Implement the route descriptor factory and local invariants
status: draft
tags:
- github-issue
- m1
- core
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M1-004
  milestone: M1
  milestone_title: M1 — Bun-Native Kernel
  status: backlog
  priority: P0
  size: M
  area: core
  kind: implementation
  global_wave: 8
  milestone_wave: 2
  depends_on:
  - M1-001
  blocks:
  - M1-006
  - M1-007
  - M1-013
  - M1-016
  - M1-018
  - M1-GATE
  conflict_group: core-route
  owner_decision: false
  recommended_branch: agent/M1-004-implement-the-route-descriptor-factory-and-local
  recommended_worktree: .worktrees/M1-004
  labels:
  - type:implementation
  - area:core
  - priority:p0
  - size:m
---

# M1-004 — Implement the route descriptor factory and local invariants

## Outcome

Create immutable route descriptors with one required handler and optional schemas/guards.

## Why this task exists

This task is a bounded unit in **M1 — Bun-Native Kernel**. It unlocks **[M1-006](M1-006-implement-named-module-route-containers.md), [M1-007](M1-007-implement-the-defineapp-validation-and-composition-shell.md), [M1-013](M1-013-validate-route-path-and-params-declaration-consistency.md), [M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-018](M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Public Api](../../architecture/public-api.md)
- [Server Kernel](../../architecture/server-kernel.md)
- [0003 Minimal Explicit Agent Friendly Api](../../decisions/0003-minimal-explicit-agent-friendly-api.md)

## Dependency contract

- **Depends on:** [M1-001](M1-001-create-the-core-public-and-internal-type-skeleton.md)
- **Blocks:** [M1-006](M1-006-implement-named-module-route-containers.md), [M1-007](M1-007-implement-the-defineapp-validation-and-composition-shell.md), [M1-013](M1-013-validate-route-path-and-params-declaration-consistency.md), [M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-018](M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md)
- **Global wave:** 8
- **Milestone wave:** 2
- **Conflict group:** `core-route`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Implement `route()` as a small identity/branding factory.
- Reject missing/non-function handler and unknown descriptor keys according to selected policy.
- Preserve sync handler types and raw/typed Response return constraints.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/core/route.ts
tests/unit/route-descriptor.test.ts
tests/types/route-descriptor.test-d.ts
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
git worktree add ".worktrees/M1-004" -b "agent/M1-004-implement-the-route-descriptor-factory-and-local" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Implement `route()` as a small identity/branding factory.
5. Implement: Reject missing/non-function handler and unknown descriptor keys according to selected policy.
6. Implement: Preserve sync handler types and raw/typed Response return constraints.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M1-004.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Descriptor creation starts no server and performs no request parsing.
- [ ] Handler plain-object or `undefined` returns fail type tests.
- [ ] Descriptor properties are readonly and safely classifiable internally.
- [ ] No path/method duplication is added inside the descriptor.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M1-004.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/unit/route-descriptor.test.ts
bun run test:types
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M1-004.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
