---
type: GitHub Issue
title: M1-007 — Implement the `defineApp` validation and composition shell
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
  id: M1-007
  milestone: M1
  milestone_title: M1 — Bun-Native Kernel
  status: backlog
  priority: P0
  size: L
  area: core
  kind: implementation
  global_wave: 10
  milestone_wave: 4
  depends_on:
  - M1-004
  - M1-005
  - M1-006
  blocks:
  - M1-008
  - M1-009
  - M1-012
  - M1-013
  - M1-014
  - M1-018
  - M1-GATE
  - M4-002
  conflict_group: core-app
  owner_decision: false
  recommended_branch: agent/M1-007-implement-the-defineapp-validation-and-compositi
  recommended_worktree: .worktrees/M1-007
  labels:
  - type:implementation
  - area:core
  - priority:p0
  - size:l
---

# M1-007 — Implement the `defineApp` validation and composition shell

## Outcome

Compose services, root routes, and modules into a validated app object before route compilation.

## Why this task exists

This task is a bounded unit in **M1 — Bun-Native Kernel**. It unlocks **[M1-008](M1-008-classify-and-preserve-native-bun-route-entries.md), [M1-009](M1-009-compile-lugas-descriptors-into-bun-handlers.md), [M1-012](M1-012-reject-duplicate-routes-and-module-ownership-conflicts.md), [M1-013](M1-013-validate-route-path-and-params-declaration-consistency.md), [M1-014](M1-014-implement-default-not-found-and-unexpected-error-policies.md), [M1-018](M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M4-002](../m4/M4-002-capture-module-path-method-and-route-kind-metadata.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Public Api](../../architecture/public-api.md)
- [Server Kernel](../../architecture/server-kernel.md)
- [0003 Minimal Explicit Agent Friendly Api](../../decisions/0003-minimal-explicit-agent-friendly-api.md)

## Dependency contract

- **Depends on:** [M1-004](M1-004-implement-the-route-descriptor-factory-and-local-invariants.md), [M1-005](M1-005-implement-named-guard-descriptors-and-metadata.md), [M1-006](M1-006-implement-named-module-route-containers.md)
- **Blocks:** [M1-008](M1-008-classify-and-preserve-native-bun-route-entries.md), [M1-009](M1-009-compile-lugas-descriptors-into-bun-handlers.md), [M1-012](M1-012-reject-duplicate-routes-and-module-ownership-conflicts.md), [M1-013](M1-013-validate-route-path-and-params-declaration-consistency.md), [M1-014](M1-014-implement-default-not-found-and-unexpected-error-policies.md), [M1-018](M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M4-002](../m4/M4-002-capture-module-path-method-and-route-kind-metadata.md)
- **Global wave:** 10
- **Milestone wave:** 4
- **Conflict group:** `core-app`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Validate app configuration and unique module names.
- Flatten route ownership records without changing Bun path semantics.
- Expose internal composition data and a placeholder truthful manifest shape without serving.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/core/app.ts
src/internal/compose.ts
tests/unit/app-compose.test.ts
tests/types/app-compose.test-d.ts
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
git worktree add ".worktrees/M1-007" -b "agent/M1-007-implement-the-defineapp-validation-and-compositi" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Validate app configuration and unique module names.
5. Implement: Flatten route ownership records without changing Bun path semantics.
6. Implement: Expose internal composition data and a placeholder truthful manifest shape without serving.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M1-007.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] App creation detects invalid module/config shapes before opening a port.
- [ ] Services retain exact type and identity.
- [ ] Root/module routes are attributed deterministically.
- [ ] No request-time route lookup or server is created.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M1-007.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/unit/app-compose.test.ts
bun run test:types
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M1-007.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
