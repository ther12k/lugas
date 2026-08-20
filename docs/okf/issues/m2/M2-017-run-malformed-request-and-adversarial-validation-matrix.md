---
type: GitHub Issue
title: M2-017 — Run malformed-request and adversarial validation matrix
status: draft
tags:
- github-issue
- m2
- security
- security
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M2-017
  milestone: M2
  milestone_title: M2 — Validation and Guards
  status: backlog
  priority: P0
  size: L
  area: security
  kind: security
  global_wave: 19
  milestone_wave: 5
  depends_on:
  - M2-009
  - M2-014
  - M0-010
  blocks:
  - M2-GATE
  - M5-008
  conflict_group: security-fixtures
  owner_decision: false
  recommended_branch: agent/M2-017-run-malformed-request-and-adversarial-validation
  recommended_worktree: .worktrees/M2-017
  labels:
  - type:security
  - area:security
  - priority:p0
  - size:l
---

# M2-017 — Run malformed-request and adversarial validation matrix

## Outcome

Execute the M0 threat fixtures against the real parser/validation/guard pipeline.

## Why this task exists

This task is a bounded unit in **M2 — Validation and Guards**. It unlocks **[M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md), [M5-008](../m5/M5-008-perform-the-full-malformed-input-and-redaction-security-review.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Security And Threat Model](../../engineering/security-and-threat-model.md)
- [Dependency And Supply Chain](../../engineering/dependency-and-supply-chain.md)

## Dependency contract

- **Depends on:** [M2-009](M2-009-unify-request-validation-problem-details-mapping.md), [M2-014](M2-014-compose-the-validation-and-guard-request-pipeline.md), [M0-010](../m0/M0-010-define-malformed-request-and-security-fixture-plan.md)
- **Blocks:** [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md), [M5-008](../m5/M5-008-perform-the-full-malformed-input-and-redaction-security-review.md)
- **Global wave:** 19
- **Milestone wave:** 5
- **Conflict group:** `security-fixtures`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Cover malformed encoding, repeated query/header values, hostile issue objects, malformed/oversized JSON, aborts, and redaction.
- Use fuzz/property generation where deterministic and bounded.
- Confirm forbidden guards/handlers do not execute.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
tests/security/m2/**
tests/fuzz/validation/**
docs/reports/m2-security.md
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
git worktree add ".worktrees/M2-017" -b "agent/M2-017-run-malformed-request-and-adversarial-validation" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Cover malformed encoding, repeated query/header values, hostile issue objects, malformed/oversized JSON, aborts, and redaction.
5. Implement: Use fuzz/property generation where deterministic and bounded.
6. Implement: Confirm forbidden guards/handlers do not execute.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M2-017.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Every M0-assigned M2 security case has pass/fail evidence.
- [ ] No crash, unhandled rejection, secret leak, or unbounded output occurs.
- [ ] Fuzz seeds are reproducible and retained.
- [ ] Failures create correction issues rather than weakened expectations.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M2-017.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run test:security:m2
bun run fuzz:validation:bounded
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M2-017.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
