---
type: GitHub Issue
title: M4-005 — Create the stable diagnostic catalog and formatter
status: draft
tags:
- github-issue
- m4
- manifest
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M4-005
  milestone: M4
  milestone_title: M4 — Manifest, Tooling, and Agent DX
  status: backlog
  priority: P0
  size: L
  area: manifest
  kind: implementation
  global_wave: 30
  milestone_wave: 1
  depends_on:
  - M3-GATE
  - M1-012
  - M2-009
  blocks:
  - M4-009
  - M4-016
  - M4-GATE
  - M5-008
  conflict_group: diagnostics
  owner_decision: false
  recommended_branch: agent/M4-005-create-the-stable-diagnostic-catalog-and-formatt
  recommended_worktree: .worktrees/M4-005
  labels:
  - type:implementation
  - area:manifest
  - priority:p0
  - size:l
---

# M4-005 — Create the stable diagnostic catalog and formatter

## Outcome

Centralize startup/client/framework diagnostics with stable codes, route context, redaction, and corrective hints.

## Why this task exists

This task is a bounded unit in **M4 — Manifest, Tooling, and Agent DX**. It unlocks **[M4-009](M4-009-lock-diagnostic-and-manifest-golden-contracts.md), [M4-016](M4-016-finalize-repository-agents-and-evidence-enforcement.md), [M4-GATE](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md), [M5-008](../m5/M5-008-perform-the-full-malformed-input-and-redaction-security-review.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Manifest And Inspection](../../architecture/manifest-and-inspection.md)
- [0014 Contract Manifest Separation](../../decisions/0014-contract-manifest-separation.md)

## Dependency contract

- **Depends on:** [M3-GATE](../m3/M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md), [M1-012](../m1/M1-012-reject-duplicate-routes-and-module-ownership-conflicts.md), [M2-009](../m2/M2-009-unify-request-validation-problem-details-mapping.md)
- **Blocks:** [M4-009](M4-009-lock-diagnostic-and-manifest-golden-contracts.md), [M4-016](M4-016-finalize-repository-agents-and-evidence-enforcement.md), [M4-GATE](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md), [M5-008](../m5/M5-008-perform-the-full-malformed-input-and-redaction-security-review.md)
- **Global wave:** 30
- **Milestone wave:** 1
- **Conflict group:** `diagnostics`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Inventory existing diagnostics and assign non-overlapping families.
- Implement a normalized error type/formatter for human and machine output.
- Document compatibility status and sensitive-field restrictions.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/internal/diagnostics.ts
src/client/errors.ts
docs/diagnostics.md
tests/unit/diagnostics.test.ts
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
git worktree add ".worktrees/M4-005" -b "agent/M4-005-create-the-stable-diagnostic-catalog-and-formatt" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Inventory existing diagnostics and assign non-overlapping families.
5. Implement: Implement a normalized error type/formatter for human and machine output.
6. Implement: Document compatibility status and sensitive-field restrictions.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M4-005.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Every existing framework diagnostic uses the catalog.
- [ ] Golden tests lock code, essential fields, and redaction—not unstable stack formatting.
- [ ] Unknown causes remain available internally without client leakage.
- [ ] Codes have documentation links or local references.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M4-005.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/unit/diagnostics.test.ts
bun run verify:docs
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M4-005.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
