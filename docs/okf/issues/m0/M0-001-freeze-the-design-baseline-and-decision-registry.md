---
type: GitHub Issue
title: M0-001 — Freeze the design baseline and decision registry
status: draft
tags:
- github-issue
- m0
- architecture
- docs
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M0-001
  milestone: M0
  milestone_title: M0 — Design Freeze and Baselines
  status: backlog
  priority: P0
  size: S
  area: architecture
  kind: docs
  global_wave: 1
  milestone_wave: 1
  depends_on: []
  blocks:
  - M0-002
  - M0-010
  - M0-GATE
  conflict_group: docs-baseline
  owner_decision: false
  recommended_branch: agent/M0-001-freeze-the-design-baseline-and-decision-registry
  recommended_worktree: .worktrees/M0-001
  labels:
  - type:docs
  - area:architecture
  - priority:p0
  - size:s
  - agent-ready
---

# M0-001 — Freeze the design baseline and decision registry

## Outcome

Bind implementation to this exact OKF bundle, record unresolved decisions, and prevent silent design drift.

## Why this task exists

This task is a bounded unit in **M0 — Design Freeze and Baselines**. It unlocks **[M0-002](M0-002-create-the-repository-skeleton-and-ownership-boundaries.md), [M0-010](M0-010-define-malformed-request-and-security-fixture-plan.md), [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Charter](../../project/charter.md)
- [Principles](../../project/principles.md)
- [Overview](../../architecture/overview.md)

## Dependency contract

- **Depends on:** **none**
- **Blocks:** [M0-002](M0-002-create-the-repository-skeleton-and-ownership-boundaries.md), [M0-010](M0-010-define-malformed-request-and-security-fixture-plan.md), [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md)
- **Global wave:** 1
- **Milestone wave:** 1
- **Conflict group:** `docs-baseline`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Copy the bundle under `docs/okf/` without rewriting provenance.
- Create `SOURCE-BASELINE.md` with archive SHA-256, initial commit, and known design uncertainties.
- Review ADR status and create an open-decision register for items not authorized by the owner.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
docs/SOURCE-BASELINE.md
docs/okf/log.md
docs/open-decisions.md
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
git worktree add ".worktrees/M0-001" -b "agent/M0-001-freeze-the-design-baseline-and-decision-registry" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Copy the bundle under `docs/okf/` without rewriting provenance.
5. Implement: Create `SOURCE-BASELINE.md` with archive SHA-256, initial commit, and known design uncertainties.
6. Implement: Review ADR status and create an open-decision register for items not authorized by the owner.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M0-001.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] The source archive and every OKF concept are identified by checksum or commit.
- [ ] No draft decision is represented as implemented evidence.
- [ ] Package/repository/license/publication decisions remain explicitly owner-blocked.
- [ ] The baseline document links the exact design gate for every later milestone.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M0-001.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run verify:docs
git diff --check
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M0-001.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
