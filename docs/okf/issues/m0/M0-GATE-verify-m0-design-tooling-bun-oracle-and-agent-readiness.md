---
type: GitHub Issue
title: M0-GATE — Verify M0 design, tooling, Bun oracle, and agent readiness
status: draft
tags:
- github-issue
- m0
- release
- gate
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M0-GATE
  milestone: M0
  milestone_title: M0 — Design Freeze and Baselines
  status: backlog
  priority: P0
  size: L
  area: release
  kind: gate
  global_wave: 6
  milestone_wave: 6
  depends_on:
  - M0-001
  - M0-002
  - M0-003
  - M0-004
  - M0-005
  - M0-006
  - M0-007
  - M0-008
  - M0-009
  - M0-010
  - M0-011
  blocks:
  - M1-001
  conflict_group: gate
  owner_decision: false
  recommended_branch: agent/M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-re
  recommended_worktree: .worktrees/M0-GATE
  labels:
  - type:gate
  - area:release
  - priority:p0
  - size:l
---

# M0-GATE — Verify M0 design, tooling, Bun oracle, and agent readiness

## Outcome

Independently verify that implementation can start without unresolved foundational ambiguity.

## Why this task exists

This task is a bounded unit in **M0 — Design Freeze and Baselines**. It unlocks **[M1-001](../m1/M1-001-create-the-core-public-and-internal-type-skeleton.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Release Gates](../../delivery/release-gates.md)
- [Review Packet Standard](../../engineering/review-packet-standard.md)

## Dependency contract

- **Depends on:** [M0-001](M0-001-freeze-the-design-baseline-and-decision-registry.md), [M0-002](M0-002-create-the-repository-skeleton-and-ownership-boundaries.md), [M0-003](M0-003-pin-bun-typescript-and-the-deterministic-toolchain.md), [M0-004](M0-004-establish-ci-skeleton-and-one-verification-command.md), [M0-005](M0-005-implement-the-okf-link-and-issue-dependency-validator.md), [M0-006](M0-006-characterize-bun-native-route-and-server-semantics.md), [M0-007](M0-007-create-raw-bun-benchmark-fixtures-and-readiness-protocol.md), [M0-008](M0-008-create-an-idiomatic-elysia-2-comparison-fixture.md), [M0-009](M0-009-prove-the-route-services-guards-and-client-type-encoding.md), [M0-010](M0-010-define-malformed-request-and-security-fixture-plan.md), [M0-011](M0-011-install-contribution-and-subagent-worktree-guards.md)
- **Blocks:** [M1-001](../m1/M1-001-create-the-core-public-and-internal-type-skeleton.md)
- **Global wave:** 6
- **Milestone wave:** 6
- **Conflict group:** `gate`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Reproduce the full M0 verification from a clean checkout.
- Review type-spike recommendation and update accepted ADR/API docs before authorizing M1.
- Confirm Bun oracle, security matrix, benchmark fixtures, CI, and worktree policy are complete.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
docs/reports/gates/M0.md
docs/okf/log.md
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
git worktree add ".worktrees/M0-GATE" -b "agent/M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-re" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Reproduce the full M0 verification from a clean checkout.
5. Implement: Review type-spike recommendation and update accepted ADR/API docs before authorizing M1.
6. Implement: Confirm Bun oracle, security matrix, benchmark fixtures, CI, and worktree policy are complete.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M0-GATE.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Every M0 issue is merged with evidence.
- [ ] The canonical public type syntax is explicitly chosen.
- [ ] `bun run verify` passes from clean checkout.
- [ ] No owner-blocked decision prevents private implementation.
- [ ] M1 tasks have non-conflicting ownership and valid dependencies.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M0-GATE.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun install --frozen-lockfile
bun run verify
git status --short
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M0-GATE.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
