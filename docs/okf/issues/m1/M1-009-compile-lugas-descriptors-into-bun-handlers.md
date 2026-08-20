---
type: GitHub Issue
title: M1-009 — Compile Lugas descriptors into Bun handlers
status: draft
tags:
- github-issue
- m1
- routing
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M1-009
  milestone: M1
  milestone_title: M1 — Bun-Native Kernel
  status: backlog
  priority: P0
  size: L
  area: routing
  kind: implementation
  global_wave: 11
  milestone_wave: 5
  depends_on:
  - M1-007
  blocks:
  - M1-010
  - M1-011
  - M1-015
  - M1-016
  - M1-GATE
  - M2-010
  conflict_group: routing-compiler
  owner_decision: false
  recommended_branch: agent/M1-009-compile-lugas-descriptors-into-bun-handlers
  recommended_worktree: .worktrees/M1-009
  labels:
  - type:implementation
  - area:routing
  - priority:p0
  - size:l
---

# M1-009 — Compile Lugas descriptors into Bun handlers

## Outcome

Create the first startup-time descriptor compiler while leaving route selection entirely to Bun.

## Why this task exists

This task is a bounded unit in **M1 — Bun-Native Kernel**. It unlocks **[M1-010](M1-010-preserve-the-synchronous-route-fast-path.md), [M1-011](M1-011-implement-services-and-base-request-context-typing.md), [M1-015](M1-015-implement-app-serve-and-safe-bun-option-passthrough.md), [M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M2-010](../m2/M2-010-execute-guards-with-sync-path-and-response-short-circuit.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Routing And Compilation](../../architecture/routing-and-compilation.md)
- [Bun Compatibility](../../architecture/bun-compatibility.md)
- [0004 Bun Native Router Authoritative](../../decisions/0004-bun-native-router-authoritative.md)

## Dependency contract

- **Depends on:** [M1-007](M1-007-implement-the-defineapp-validation-and-composition-shell.md)
- **Blocks:** [M1-010](M1-010-preserve-the-synchronous-route-fast-path.md), [M1-011](M1-011-implement-services-and-base-request-context-typing.md), [M1-015](M1-015-implement-app-serve-and-safe-bun-option-passthrough.md), [M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M2-010](../m2/M2-010-execute-guards-with-sync-path-and-response-short-circuit.md)
- **Global wave:** 11
- **Milestone wave:** 5
- **Conflict group:** `routing-compiler`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Compile base request context with request, services, and params.
- Call the route handler and enforce native Response output.
- Attach route identity for unexpected-error diagnostics without adding parsing/guards yet.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/internal/compile-route.ts
tests/unit/compile-route.test.ts
tests/integration/plain-route.test.ts
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
git worktree add ".worktrees/M1-009" -b "agent/M1-009-compile-lugas-descriptors-into-bun-handlers" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Compile base request context with request, services, and params.
5. Implement: Call the route handler and enforce native Response output.
6. Implement: Attach route identity for unexpected-error diagnostics without adding parsing/guards yet.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M1-009.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Compiled handlers are stored in the Bun route map under original method/path.
- [ ] No catch-all/custom router exists.
- [ ] A non-Response runtime return fails through stable unexpected-error handling.
- [ ] Concurrent requests never share mutable context.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M1-009.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/unit/compile-route.test.ts
bun test tests/integration/plain-route.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M1-009.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
