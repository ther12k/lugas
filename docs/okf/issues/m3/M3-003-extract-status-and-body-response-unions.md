---
type: GitHub Issue
title: M3-003 — Extract status and body response unions
status: draft
tags:
- github-issue
- m3
- types
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M3-003
  milestone: M3
  milestone_title: M3 — Typed Contract and Client
  status: backlog
  priority: P0
  size: L
  area: types
  kind: implementation
  global_wave: 22
  milestone_wave: 2
  depends_on:
  - M3-001
  - M1-003
  blocks:
  - M3-004
  - M3-011
  - M3-GATE
  conflict_group: client-types
  owner_decision: false
  recommended_branch: agent/M3-003-extract-status-and-body-response-unions
  recommended_worktree: .worktrees/M3-003
  labels:
  - type:implementation
  - area:types
  - priority:p0
  - size:l
---

# M3-003 — Extract status and body response unions

## Outcome

Represent handler typed responses as status-discriminated client outcomes while widening raw responses safely.

## Why this task exists

This task is a bounded unit in **M3 — Typed Contract and Client**. It unlocks **[M3-004](M3-004-merge-guard-responses-into-client-outcome-types.md), [M3-011](M3-011-parse-http-responses-into-discriminated-client-results.md), [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Contract Type System](../../architecture/contract-type-system.md)
- [Typescript Performance](../../engineering/typescript-performance.md)

## Dependency contract

- **Depends on:** [M3-001](M3-001-extract-the-application-route-contract-type.md), [M1-003](../m1/M1-003-implement-text-empty-problem-and-redirect.md)
- **Blocks:** [M3-004](M3-004-merge-guard-responses-into-client-outcome-types.md), [M3-011](M3-011-parse-http-responses-into-discriminated-client-results.md), [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)
- **Global wave:** 22
- **Milestone wave:** 2
- **Conflict group:** `client-types`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Extract status/body/media kind from typed response helpers.
- Support unions from conditional handler returns and async functions.
- Define conservative number/unknown fallback for raw Response.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/core/contract.ts
src/client/types.ts
tests/types/response-contract.test-d.ts
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
git worktree add ".worktrees/M3-003" -b "agent/M3-003-extract-status-and-body-response-unions" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Extract status/body/media kind from typed response helpers.
5. Implement: Support unions from conditional handler returns and async functions.
6. Implement: Define conservative number/unknown fallback for raw Response.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M3-003.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Exact 200/201/204/404/etc. statuses narrow in type tests.
- [ ] Async returns preserve the same union after `Awaited`.
- [ ] Raw response affects only its route and never becomes `any`.
- [ ] Duplicate status bodies become a visible union.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M3-003.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run test:types:client
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M3-003.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
