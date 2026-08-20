---
type: GitHub Issue
title: M2-018 — Close route-context and guard type tests
status: draft
tags:
- github-issue
- m2
- types
- test
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M2-018
  milestone: M2
  milestone_title: M2 — Validation and Guards
  status: backlog
  priority: P0
  size: L
  area: types
  kind: test
  global_wave: 19
  milestone_wave: 5
  depends_on:
  - M2-011
  - M2-012
  - M2-014
  blocks:
  - M2-GATE
  conflict_group: type-tests
  owner_decision: false
  recommended_branch: agent/M2-018-close-route-context-and-guard-type-tests
  recommended_worktree: .worktrees/M2-018
  labels:
  - type:test
  - area:types
  - priority:p0
  - size:l
---

# M2-018 — Close route-context and guard type tests

## Outcome

Prove all declared input and guard types across modules before the client contract is built.

## Why this task exists

This task is a bounded unit in **M2 — Validation and Guards**. It unlocks **[M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Contract Type System](../../architecture/contract-type-system.md)
- [Typescript Performance](../../engineering/typescript-performance.md)

## Dependency contract

- **Depends on:** [M2-011](M2-011-propagate-typed-guard-context-enrichment.md), [M2-012](M2-012-merge-guard-short-circuit-responses-into-route-contracts.md), [M2-014](M2-014-compose-the-validation-and-guard-request-pipeline.md)
- **Blocks:** [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)
- **Global wave:** 19
- **Milestone wave:** 5
- **Conflict group:** `type-tests`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Create compile-pass/fail matrix for absent/present schemas and guard fields.
- Test schema input/output transforms and raw params fallback.
- Measure type diagnostics against the M0 spike baseline.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
tests/types/m2/**
docs/reports/m2-type-contract.md
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
git worktree add ".worktrees/M2-018" -b "agent/M2-018-close-route-context-and-guard-type-tests" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Create compile-pass/fail matrix for absent/present schemas and guard fields.
5. Implement: Test schema input/output transforms and raw params fallback.
6. Implement: Measure type diagnostics against the M0 spike baseline.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M2-018.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Invalid handler access to undeclared query/body/header fields fails.
- [ ] Guard enrichment and response unions remain readable.
- [ ] No new broad cast/`any` masks failures.
- [ ] Type-performance delta is within accepted M0 bounds or a correction is opened.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M2-018.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run test:types:m2
bun run typebench:quick
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M2-018.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
