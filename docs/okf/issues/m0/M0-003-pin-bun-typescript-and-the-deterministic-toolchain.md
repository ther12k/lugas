---
type: GitHub Issue
title: M0-003 — Pin Bun, TypeScript, and the deterministic toolchain
status: draft
tags:
- github-issue
- m0
- packaging
- integration
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M0-003
  milestone: M0
  milestone_title: M0 — Design Freeze and Baselines
  status: backlog
  priority: P0
  size: M
  area: packaging
  kind: integration
  global_wave: 3
  milestone_wave: 3
  depends_on:
  - M0-002
  blocks:
  - M0-004
  - M0-005
  - M0-006
  - M0-007
  - M0-008
  - M0-009
  - M0-GATE
  conflict_group: shared-package
  owner_decision: false
  recommended_branch: agent/M0-003-pin-bun-typescript-and-the-deterministic-toolcha
  recommended_worktree: .worktrees/M0-003
  labels:
  - type:integration
  - area:packaging
  - priority:p0
  - size:m
---

# M0-003 — Pin Bun, TypeScript, and the deterministic toolchain

## Outcome

Establish a reproducible Bun/TypeScript baseline and committed lockfile without adding production runtime dependencies.

## Why this task exists

This task is a bounded unit in **M0 — Design Freeze and Baselines**. It unlocks **[M0-004](M0-004-establish-ci-skeleton-and-one-verification-command.md), [M0-005](M0-005-implement-the-okf-link-and-issue-dependency-validator.md), [M0-006](M0-006-characterize-bun-native-route-and-server-semantics.md), [M0-007](M0-007-create-raw-bun-benchmark-fixtures-and-readiness-protocol.md), [M0-008](M0-008-create-an-idiomatic-elysia-2-comparison-fixture.md), [M0-009](M0-009-prove-the-route-services-guards-and-client-type-encoding.md), [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Packaging And Exports](../../architecture/packaging-and-exports.md)
- [Dependency And Supply Chain](../../engineering/dependency-and-supply-chain.md)

## Dependency contract

- **Depends on:** [M0-002](M0-002-create-the-repository-skeleton-and-ownership-boundaries.md)
- **Blocks:** [M0-004](M0-004-establish-ci-skeleton-and-one-verification-command.md), [M0-005](M0-005-implement-the-okf-link-and-issue-dependency-validator.md), [M0-006](M0-006-characterize-bun-native-route-and-server-semantics.md), [M0-007](M0-007-create-raw-bun-benchmark-fixtures-and-readiness-protocol.md), [M0-008](M0-008-create-an-idiomatic-elysia-2-comparison-fixture.md), [M0-009](M0-009-prove-the-route-services-guards-and-client-type-encoding.md), [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md)
- **Global wave:** 3
- **Milestone wave:** 3
- **Conflict group:** `shared-package`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Select exact Bun 1.4.x and TypeScript versions based on current compatibility.
- Create package scripts for typecheck, test, and document validation placeholders.
- Record tool versions and lockfile hash in a machine-readable or Markdown manifest.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
package.json
bun.lock
tsconfig.json
docs/toolchain.md
.bun-version
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
git worktree add ".worktrees/M0-003" -b "agent/M0-003-pin-bun-typescript-and-the-deterministic-toolcha" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Select exact Bun 1.4.x and TypeScript versions based on current compatibility.
5. Implement: Create package scripts for typecheck, test, and document validation placeholders.
6. Implement: Record tool versions and lockfile hash in a machine-readable or Markdown manifest.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M0-003.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] `bun install --frozen-lockfile` succeeds from a clean checkout.
- [ ] Production dependency count is zero.
- [ ] Bun and TypeScript versions are printed by a documented command.
- [ ] Toolchain changes require the dedicated compatibility/upgrade workflow.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M0-003.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun install --frozen-lockfile
bun --version
bunx tsc --version
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M0-003.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
