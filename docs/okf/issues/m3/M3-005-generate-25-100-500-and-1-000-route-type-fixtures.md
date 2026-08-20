---
type: GitHub Issue
title: M3-005 — Generate 25, 100, 500, and 1,000 route type fixtures
status: draft
tags:
- github-issue
- m3
- types
- benchmark
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M3-005
  milestone: M3
  milestone_title: M3 — Typed Contract and Client
  status: backlog
  priority: P0
  size: M
  area: types
  kind: benchmark
  global_wave: 22
  milestone_wave: 2
  depends_on:
  - M3-001
  blocks:
  - M3-017
  - M3-GATE
  conflict_group: type-fixtures
  owner_decision: false
  recommended_branch: agent/M3-005-generate-25-100-500-and-1-000-route-type-fixture
  recommended_worktree: .worktrees/M3-005
  labels:
  - type:benchmark
  - area:types
  - priority:p0
  - size:m
---

# M3-005 — Generate 25, 100, 500, and 1,000 route type fixtures

## Outcome

Create deterministic stress applications that exercise realistic contract diversity.

## Why this task exists

This task is a bounded unit in **M3 — Typed Contract and Client**. It unlocks **[M3-017](M3-017-establish-the-typescript-performance-gate-and-fallback-policy.md), [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Contract Type System](../../architecture/contract-type-system.md)
- [Typescript Performance](../../engineering/typescript-performance.md)

## Dependency contract

- **Depends on:** [M3-001](M3-001-extract-the-application-route-contract-type.md)
- **Blocks:** [M3-017](M3-017-establish-the-typescript-performance-gate-and-fallback-policy.md), [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)
- **Global wave:** 22
- **Milestone wave:** 2
- **Conflict group:** `type-fixtures`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Generate mixed methods, params, schemas, guards, typed/raw responses, and modules.
- Produce stable source from a seeded generator.
- Keep fixtures separate from production package exports.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
scripts/generate-type-fixtures.ts
tests/type-performance/**
docs/reports/type-fixture-spec.md
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
git worktree add ".worktrees/M3-005" -b "agent/M3-005-generate-25-100-500-and-1-000-route-type-fixture" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Generate mixed methods, params, schemas, guards, typed/raw responses, and modules.
5. Implement: Produce stable source from a seeded generator.
6. Implement: Keep fixtures separate from production package exports.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M3-005.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Regeneration is deterministic and diff-free.
- [ ] Every size fixture typechecks independently.
- [ ] Fixture complexity is documented and not a trivial repeated static route.
- [ ] Generator can vary guard/schema density for diagnosis.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M3-005.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run generate:type-fixtures
git diff --exit-code tests/type-performance
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M3-005.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
