---
type: GitHub Issue
title: M6-001 — Freeze the beta public API candidate and deprecation policy
status: draft
tags:
- github-issue
- m6
- architecture
- docs
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M6-001
  milestone: M6
  milestone_title: M6 — Beta Stabilization and Release
  status: backlog
  priority: P0
  size: L
  area: architecture
  kind: docs
  global_wave: 43
  milestone_wave: 1
  depends_on:
  - M5-GATE
  blocks:
  - M6-009
  - M6-GATE
  conflict_group: architecture-review
  owner_decision: false
  recommended_branch: agent/M6-001-freeze-the-beta-public-api-candidate-and-depreca
  recommended_worktree: .worktrees/M6-001
  labels:
  - type:docs
  - area:architecture
  - priority:p0
  - size:l
---

# M6-001 — Freeze the beta public API candidate and deprecation policy

## Outcome

Declare the exact beta public values, types, subpaths, diagnostics, manifest version, and behavior with no accidental exports.

## Why this task exists

This task is a bounded unit in **M6 — Beta Stabilization and Release**. It unlocks **[M6-009](M6-009-rerun-final-security-performance-type-and-package-evidence.md), [M6-GATE](M6-GATE-approve-or-reject-the-v0-1-0-beta-1-release-candidate.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Charter](../../project/charter.md)
- [Principles](../../project/principles.md)
- [Overview](../../architecture/overview.md)

## Dependency contract

- **Depends on:** [M5-GATE](../m5/M5-GATE-verify-private-alpha-hardening-and-evidence.md)
- **Blocks:** [M6-009](M6-009-rerun-final-security-performance-type-and-package-evidence.md), [M6-GATE](M6-GATE-approve-or-reject-the-v0-1-0-beta-1-release-candidate.md)
- **Global wave:** 43
- **Milestone wave:** 1
- **Conflict group:** `architecture-review`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Inventory packed package and generated declarations.
- Resolve M5 API review corrections through deletion/rename before freeze.
- Document 0.x breaking-change and deprecation policy.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
docs/api-reference.md
docs/beta-compatibility-policy.md
docs/reports/m6-api-freeze.md
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
git worktree add ".worktrees/M6-001" -b "agent/M6-001-freeze-the-beta-public-api-candidate-and-depreca" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Inventory packed package and generated declarations.
5. Implement: Resolve M5 API review corrections through deletion/rename before freeze.
6. Implement: Document 0.x breaking-change and deprecation policy.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M6-001.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Public API inventory matches package exports and docs.
- [ ] Every symbol has canonical example and compatibility status.
- [ ] No internal type/path is importable.
- [ ] Remaining beta changes require ADR and migration note.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M6-001.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run api:inventory
bun run package:dry-run
bun run verify:docs
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M6-001.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
