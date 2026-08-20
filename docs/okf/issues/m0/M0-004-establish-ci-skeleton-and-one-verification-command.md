---
type: GitHub Issue
title: M0-004 — Establish CI skeleton and one verification command
status: draft
tags:
- github-issue
- m0
- ci
- integration
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M0-004
  milestone: M0
  milestone_title: M0 — Design Freeze and Baselines
  status: backlog
  priority: P0
  size: M
  area: ci
  kind: integration
  global_wave: 4
  milestone_wave: 4
  depends_on:
  - M0-002
  - M0-003
  blocks:
  - M0-011
  - M0-GATE
  - M5-010
  conflict_group: shared-ci
  owner_decision: false
  recommended_branch: agent/M0-004-establish-ci-skeleton-and-one-verification-comma
  recommended_worktree: .worktrees/M0-004
  labels:
  - type:integration
  - area:ci
  - priority:p0
  - size:m
---

# M0-004 — Establish CI skeleton and one verification command

## Outcome

Provide a single local verification entry point and a minimal pull-request CI pipeline that fails honestly.

## Why this task exists

This task is a bounded unit in **M0 — Design Freeze and Baselines**. It unlocks **[M0-011](M0-011-install-contribution-and-subagent-worktree-guards.md), [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md), [M5-010](../m5/M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-windows.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Ci And Quality Gates](../../engineering/ci-and-quality-gates.md)
- [Subagent Worktree Protocol](../../engineering/subagent-worktree-protocol.md)

## Dependency contract

- **Depends on:** [M0-002](M0-002-create-the-repository-skeleton-and-ownership-boundaries.md), [M0-003](M0-003-pin-bun-typescript-and-the-deterministic-toolchain.md)
- **Blocks:** [M0-011](M0-011-install-contribution-and-subagent-worktree-guards.md), [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md), [M5-010](../m5/M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-windows.md)
- **Global wave:** 4
- **Milestone wave:** 4
- **Conflict group:** `shared-ci`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Implement `bun run verify` as a transparent composition of named checks.
- Add CI jobs for install, typecheck, tests, docs validation, and diff hygiene.
- Pin action/tool versions and avoid publish credentials.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
scripts/verify.ts
.github/workflows/ci.yml
package.json
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
git worktree add ".worktrees/M0-004" -b "agent/M0-004-establish-ci-skeleton-and-one-verification-comma" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Implement `bun run verify` as a transparent composition of named checks.
5. Implement: Add CI jobs for install, typecheck, tests, docs validation, and diff hygiene.
6. Implement: Pin action/tool versions and avoid publish credentials.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M0-004.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Local `bun run verify` and CI execute the same core checks.
- [ ] A deliberately failing test/type/doc fixture fails CI.
- [ ] CI does not auto-fix or commit files.
- [ ] No benchmark claim is produced by noisy PR runners.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M0-004.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run verify
bun run verify --help
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M0-004.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
