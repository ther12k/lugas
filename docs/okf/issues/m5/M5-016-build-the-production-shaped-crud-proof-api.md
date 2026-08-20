---
type: GitHub Issue
title: M5-016 — Build the production-shaped CRUD proof API
status: draft
tags:
- github-issue
- m5
- testing
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M5-016
  milestone: M5
  milestone_title: M5 — Hardening and Private Alpha
  status: backlog
  priority: P0
  size: L
  area: testing
  kind: implementation
  global_wave: 38
  milestone_wave: 1
  depends_on:
  - M4-GATE
  - M4-013
  blocks:
  - M5-017
  - M5-GATE
  - M6-002
  - M6-008
  conflict_group: proof-api
  owner_decision: false
  recommended_branch: agent/M5-016-build-the-production-shaped-crud-proof-api
  recommended_worktree: .worktrees/M5-016
  labels:
  - type:implementation
  - area:testing
  - priority:p0
  - size:l
---

# M5-016 — Build the production-shaped CRUD proof API

## Outcome

Demonstrate all alpha capabilities in one realistic in-memory API with comparable raw Bun/Elysia variants.

## Why this task exists

This task is a bounded unit in **M5 — Hardening and Private Alpha**. It unlocks **[M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md), [M6-002](../m6/M6-002-complete-raw-bun-and-elysia-migration-adoption-documentation.md), [M6-008](../m6/M6-008-run-an-independent-clean-room-agent-implementation-and-review.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Testing Interface](../../architecture/testing-interface.md)
- [Testing Strategy](../../engineering/testing-strategy.md)
- [Conformance Matrix](../../engineering/conformance-matrix.md)

## Dependency contract

- **Depends on:** [M4-GATE](../m4/M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md), [M4-013](../m4/M4-013-create-canonical-basic-validation-auth-and-client-examples.md)
- **Blocks:** [M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md), [M6-002](../m6/M6-002-complete-raw-bun-and-elysia-migration-adoption-documentation.md), [M6-008](../m6/M6-008-run-an-independent-clean-room-agent-implementation-and-review.md)
- **Global wave:** 38
- **Milestone wave:** 1
- **Conflict group:** `proof-api`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Implement list/create/read/update/delete, validation, auth/role guards, 404/409/422, 204, native asset, failure, slow/abort, and concurrency.
- Use the same domain repository and response contract across variants where possible.
- Add public client and test-server integration.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
examples/proof-api/**
benchmarks/shared-domain/**
benchmarks/raw-bun/proof-api/**
benchmarks/lugas/proof-api/**
benchmarks/elysia/proof-api/**
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
git worktree add ".worktrees/M5-016" -b "agent/M5-016-build-the-production-shaped-crud-proof-api" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Implement list/create/read/update/delete, validation, auth/role guards, 404/409/422, 204, native asset, failure, slow/abort, and concurrency.
5. Implement: Use the same domain repository and response contract across variants where possible.
6. Implement: Add public client and test-server integration.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M5-016.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Proof API uses only public Lugas exports.
- [ ] Raw Bun/Lugas/Elysia behavior-equivalence tests pass.
- [ ] No database/network dependency obscures framework behavior.
- [ ] README states limitations and exact commands.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M5-016.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run test:proof-api
bun run proof-api:smoke
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M5-016.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
