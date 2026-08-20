---
type: GitHub Issue
title: M0-009 — Prove the route, services, guards, and client type encoding
status: draft
tags:
- github-issue
- m0
- types
- spike
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M0-009
  milestone: M0
  milestone_title: M0 — Design Freeze and Baselines
  status: backlog
  priority: P0
  size: L
  area: types
  kind: spike
  global_wave: 4
  milestone_wave: 4
  depends_on:
  - M0-003
  blocks:
  - M0-GATE
  - M1-001
  - M2-011
  - M2-012
  - M3-001
  conflict_group: types-spike
  owner_decision: false
  recommended_branch: agent/M0-009-prove-the-route-services-guards-and-client-type-
  recommended_worktree: .worktrees/M0-009
  labels:
  - type:spike
  - area:types
  - priority:p0
  - size:l
---

# M0-009 — Prove the route, services, guards, and client type encoding

## Outcome

Select one feasible canonical TypeScript encoding before public runtime APIs are implemented.

## Why this task exists

This task is a bounded unit in **M0 — Design Freeze and Baselines**. It unlocks **[M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md), [M1-001](../m1/M1-001-create-the-core-public-and-internal-type-skeleton.md), [M2-011](../m2/M2-011-propagate-typed-guard-context-enrichment.md), [M2-012](../m2/M2-012-merge-guard-short-circuit-responses-into-route-contracts.md), [M3-001](../m3/M3-001-extract-the-application-route-contract-type.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Contract Type System](../../architecture/contract-type-system.md)
- [Typescript Performance](../../engineering/typescript-performance.md)

## Dependency contract

- **Depends on:** [M0-003](M0-003-pin-bun-typescript-and-the-deterministic-toolchain.md)
- **Blocks:** [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md), [M1-001](../m1/M1-001-create-the-core-public-and-internal-type-skeleton.md), [M2-011](../m2/M2-011-propagate-typed-guard-context-enrichment.md), [M2-012](../m2/M2-012-merge-guard-short-circuit-responses-into-route-contracts.md), [M3-001](../m3/M3-001-extract-the-application-route-contract-type.md)
- **Global wave:** 4
- **Milestone wave:** 4
- **Conflict group:** `types-spike`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Prototype explicit `defineModule<Services>`/`guard<Services>` generics, a stateless type-bound definition kit, and inline contextual typing.
- Prove schema output, guard enrichment order, handler response union, method/path lookup, and raw response widening.
- Measure 25/100/500 route compiler diagnostics for each viable alternative.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
spikes/type-contract/**
tests/types/spike/**
docs/reports/m0-type-contract-spike.md
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
git worktree add ".worktrees/M0-009" -b "agent/M0-009-prove-the-route-services-guards-and-client-type-" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Prototype explicit `defineModule<Services>`/`guard<Services>` generics, a stateless type-bound definition kit, and inline contextual typing.
5. Implement: Prove schema output, guard enrichment order, handler response union, method/path lookup, and raw response widening.
6. Implement: Measure 25/100/500 route compiler diagnostics for each viable alternative.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M0-009.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] No alternative relies on mutable builders, global declaration merging, `any`, decorators, or a Proxy client.
- [ ] The selected syntax has readable handler/client hovers and compile-fail tests.
- [ ] Services and guard enrichment work across separate module files.
- [ ] A decision report recommends one syntax with type-cost evidence and required ADR/doc corrections.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M0-009.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run typecheck:spike
bun run typebench:spike
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M0-009.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
