---
type: GitHub Issue
title: M2-011 — Propagate typed guard context enrichment
status: draft
tags:
- github-issue
- m2
- guards
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M2-011
  milestone: M2
  milestone_title: M2 — Validation and Guards
  status: backlog
  priority: P0
  size: L
  area: guards
  kind: implementation
  global_wave: 16
  milestone_wave: 2
  depends_on:
  - M2-010
  - M1-011
  - M0-009
  blocks:
  - M2-013
  - M2-018
  - M2-GATE
  conflict_group: core-types
  owner_decision: false
  recommended_branch: agent/M2-011-propagate-typed-guard-context-enrichment
  recommended_worktree: .worktrees/M2-011
  labels:
  - type:implementation
  - area:guards
  - priority:p0
  - size:l
---

# M2-011 — Propagate typed guard context enrichment

## Outcome

Make each guard enrichment available to later guards and handlers with collision-safe readonly types.

## Why this task exists

This task is a bounded unit in **M2 — Validation and Guards**. It unlocks **[M2-013](M2-013-close-multi-guard-ordering-collision-and-failure-semantics.md), [M2-018](M2-018-close-route-context-and-guard-type-tests.md), [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Lifecycle And Guards](../../architecture/lifecycle-and-guards.md)
- [Request Context](../../architecture/request-context.md)
- [0011 Explicit Services Guard Enrichment](../../decisions/0011-explicit-services-guard-enrichment.md)

## Dependency contract

- **Depends on:** [M2-010](M2-010-execute-guards-with-sync-path-and-response-short-circuit.md), [M1-011](../m1/M1-011-implement-services-and-base-request-context-typing.md), [M0-009](../m0/M0-009-prove-the-route-services-guards-and-client-type-encoding.md)
- **Blocks:** [M2-013](M2-013-close-multi-guard-ordering-collision-and-failure-semantics.md), [M2-018](M2-018-close-route-context-and-guard-type-tests.md), [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)
- **Global wave:** 16
- **Milestone wave:** 2
- **Conflict group:** `core-types`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Implement ordered context merge semantics from the selected type design.
- Reject overwrite of base fields and duplicate enrichment keys.
- Keep runtime merge behavior aligned with type order.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/core/types.ts
src/internal/context.ts
tests/types/guard-enrichment.test-d.ts
tests/integration/guard-enrichment.test.ts
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
git worktree add ".worktrees/M2-011" -b "agent/M2-011-propagate-typed-guard-context-enrichment" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Implement ordered context merge semantics from the selected type design.
5. Implement: Reject overwrite of base fields and duplicate enrichment keys.
6. Implement: Keep runtime merge behavior aligned with type order.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M2-011.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Later guard and handler hovers show exact enrichment fields.
- [ ] Earlier guards cannot reference later enrichment.
- [ ] Duplicate/base-key collisions fail type tests and runtime startup where detectable.
- [ ] Concurrent requests do not share enrichment objects.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M2-011.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run test:types
bun test tests/integration/guard-enrichment.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M2-011.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
