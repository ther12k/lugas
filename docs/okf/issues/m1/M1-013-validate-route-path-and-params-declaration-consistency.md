---
type: GitHub Issue
title: M1-013 — Validate route path and params declaration consistency
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
  id: M1-013
  milestone: M1
  milestone_title: M1 — Bun-Native Kernel
  status: backlog
  priority: P0
  size: M
  area: routing
  kind: implementation
  global_wave: 11
  milestone_wave: 5
  depends_on:
  - M1-004
  - M1-007
  blocks:
  - M1-016
  - M1-GATE
  - M2-003
  conflict_group: routing-path
  owner_decision: false
  recommended_branch: agent/M1-013-validate-route-path-and-params-declaration-consi
  recommended_worktree: .worktrees/M1-013
  labels:
  - type:implementation
  - area:routing
  - priority:p0
  - size:m
---

# M1-013 — Validate route path and params declaration consistency

## Outcome

Catch invalid path syntax and safely detectable params-schema mismatches without pretending generic schema introspection.

## Why this task exists

This task is a bounded unit in **M1 — Bun-Native Kernel**. It unlocks **[M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M2-003](../m2/M2-003-add-params-validation-and-transformed-output.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Routing And Compilation](../../architecture/routing-and-compilation.md)
- [Bun Compatibility](../../architecture/bun-compatibility.md)
- [0004 Bun Native Router Authoritative](../../decisions/0004-bun-native-router-authoritative.md)

## Dependency contract

- **Depends on:** [M1-004](M1-004-implement-the-route-descriptor-factory-and-local-invariants.md), [M1-007](M1-007-implement-the-defineapp-validation-and-composition-shell.md)
- **Blocks:** [M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M2-003](../m2/M2-003-add-params-validation-and-transformed-output.md)
- **Global wave:** 11
- **Milestone wave:** 5
- **Conflict group:** `routing-path`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Validate leading slash and path token invariants supported by Bun.
- Extract literal param names for type/client use.
- Only compare runtime schema keys when a reliable adapter exposes them; otherwise document type-level checks.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/internal/path.ts
src/internal/diagnostics.ts
tests/unit/path-validation.test.ts
tests/types/path-params.test-d.ts
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
git worktree add ".worktrees/M1-013" -b "agent/M1-013-validate-route-path-and-params-declaration-consi" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Validate leading slash and path token invariants supported by Bun.
5. Implement: Extract literal param names for type/client use.
6. Implement: Only compare runtime schema keys when a reliable adapter exposes them; otherwise document type-level checks.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M1-013.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Invalid paths fail with stable route diagnostic.
- [ ] Client path param extraction handles multiple params and wildcards according to policy.
- [ ] No validator-specific private introspection is used.
- [ ] False runtime schema claims are absent.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M1-013.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/unit/path-validation.test.ts
bun run test:types
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M1-013.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
