---
type: GitHub Issue
title: M2-002 — Normalize validation issues safely
status: draft
tags:
- github-issue
- m2
- validation
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M2-002
  milestone: M2
  milestone_title: M2 — Validation and Guards
  status: backlog
  priority: P0
  size: M
  area: validation
  kind: implementation
  global_wave: 16
  milestone_wave: 2
  depends_on:
  - M2-001
  - M1-003
  blocks:
  - M2-009
  - M2-GATE
  conflict_group: validation
  owner_decision: false
  recommended_branch: agent/M2-002-normalize-validation-issues-safely
  recommended_worktree: .worktrees/M2-002
  labels:
  - type:implementation
  - area:validation
  - priority:p0
  - size:m
---

# M2-002 — Normalize validation issues safely

## Outcome

Convert validator failures into bounded, serializable issue data without leaking input or depending on library-specific internals.

## Why this task exists

This task is a bounded unit in **M2 — Validation and Guards**. It unlocks **[M2-009](M2-009-unify-request-validation-problem-details-mapping.md), [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Schema And Validation](../../architecture/schema-and-validation.md)
- [Security And Threat Model](../../engineering/security-and-threat-model.md)
- [0008 Optional Standard Schema](../../decisions/0008-optional-standard-schema.md)

## Dependency contract

- **Depends on:** [M2-001](M2-001-implement-the-standard-schema-executor-and-dependency-decision.md), [M1-003](../m1/M1-003-implement-text-empty-problem-and-redirect.md)
- **Blocks:** [M2-009](M2-009-unify-request-validation-problem-details-mapping.md), [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)
- **Global wave:** 16
- **Milestone wave:** 2
- **Conflict group:** `validation`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Define a stable normalized issue subset and preservation policy for safe extension fields.
- Cap issue count, nesting depth, path length, and serialized size.
- Handle cyclic/non-serializable hostile issue objects.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/internal/validation-issues.ts
tests/unit/validation-issues.test.ts
tests/security/validation-issue-redaction.test.ts
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
git worktree add ".worktrees/M2-002" -b "agent/M2-002-normalize-validation-issues-safely" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Define a stable normalized issue subset and preservation policy for safe extension fields.
5. Implement: Cap issue count, nesting depth, path length, and serialized size.
6. Implement: Handle cyclic/non-serializable hostile issue objects.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M2-002.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Normalization never throws for tested malformed issue objects.
- [ ] Raw request values, causes, and schema instances are not serialized.
- [ ] Truncation is deterministic and explicitly indicated.
- [ ] Multiple validator issue shapes have golden tests.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M2-002.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/unit/validation-issues.test.ts
bun test tests/security/validation-issue-redaction.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M2-002.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
