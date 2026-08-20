---
type: GitHub Issue
title: M2-009 — Unify request validation Problem Details mapping
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
  id: M2-009
  milestone: M2
  milestone_title: M2 — Validation and Guards
  status: backlog
  priority: P0
  size: M
  area: validation
  kind: implementation
  global_wave: 17
  milestone_wave: 3
  depends_on:
  - M2-002
  - M2-003
  - M2-005
  - M2-006
  - M2-008
  blocks:
  - M2-017
  - M2-GATE
  - M4-005
  conflict_group: validation
  owner_decision: false
  recommended_branch: agent/M2-009-unify-request-validation-problem-details-mapping
  recommended_worktree: .worktrees/M2-009
  labels:
  - type:implementation
  - area:validation
  - priority:p0
  - size:m
---

# M2-009 — Unify request validation Problem Details mapping

## Outcome

Produce one stable, source-aware validation error contract for params, query, headers, and body.

## Why this task exists

This task is a bounded unit in **M2 — Validation and Guards**. It unlocks **[M2-017](M2-017-run-malformed-request-and-adversarial-validation-matrix.md), [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md), [M4-005](../m4/M4-005-create-the-stable-diagnostic-catalog-and-formatter.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Schema And Validation](../../architecture/schema-and-validation.md)
- [Security And Threat Model](../../engineering/security-and-threat-model.md)
- [0008 Optional Standard Schema](../../decisions/0008-optional-standard-schema.md)

## Dependency contract

- **Depends on:** [M2-002](M2-002-normalize-validation-issues-safely.md), [M2-003](M2-003-add-params-validation-and-transformed-output.md), [M2-005](M2-005-add-query-validation-and-inferred-output.md), [M2-006](M2-006-add-lower-case-header-projection-and-validation.md), [M2-008](M2-008-add-json-body-validation-and-transformed-output.md)
- **Blocks:** [M2-017](M2-017-run-malformed-request-and-adversarial-validation-matrix.md), [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md), [M4-005](../m4/M4-005-create-the-stable-diagnostic-catalog-and-formatter.md)
- **Global wave:** 17
- **Milestone wave:** 3
- **Conflict group:** `validation`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Define codes/status/title/type policy for parse versus schema failures.
- Attach safe location metadata and bounded issues.
- Keep status/media type/body consistent across all inputs.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/internal/validation-problem.ts
tests/integration/validation-problems.test.ts
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
git worktree add ".worktrees/M2-009" -b "agent/M2-009-unify-request-validation-problem-details-mapping" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Define codes/status/title/type policy for parse versus schema failures.
5. Implement: Attach safe location metadata and bounded issues.
6. Implement: Keep status/media type/body consistent across all inputs.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M2-009.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Params/query/headers/body failures use the documented shared format.
- [ ] 400, 415, and 422 remain distinguishable by status/code.
- [ ] Problem bodies pass RFC 9457 field tests.
- [ ] Golden snapshots exclude unstable stack/library object formatting.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M2-009.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/integration/validation-problems.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M2-009.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
