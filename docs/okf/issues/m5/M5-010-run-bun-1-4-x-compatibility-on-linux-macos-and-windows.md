---
type: GitHub Issue
title: M5-010 — Run Bun 1.4.x compatibility on Linux, macOS, and Windows
status: draft
tags:
- github-issue
- m5
- ci
- integration
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M5-010
  milestone: M5
  milestone_title: M5 — Hardening and Private Alpha
  status: backlog
  priority: P0
  size: L
  area: ci
  kind: integration
  global_wave: 38
  milestone_wave: 1
  depends_on:
  - M0-004
  - M4-GATE
  blocks:
  - M5-017
  - M5-GATE
  - M6-006
  conflict_group: shared-ci
  owner_decision: false
  recommended_branch: agent/M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-w
  recommended_worktree: .worktrees/M5-010
  labels:
  - type:integration
  - area:ci
  - priority:p0
  - size:l
---

# M5-010 — Run Bun 1.4.x compatibility on Linux, macOS, and Windows

## Outcome

Establish the actual supported OS/Bun matrix and identify native-semantic differences.

## Why this task exists

This task is a bounded unit in **M5 — Hardening and Private Alpha**. It unlocks **[M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md), [M6-006](../m6/M6-006-finalize-the-supported-bun-1-4-compatibility-matrix.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Ci And Quality Gates](../../engineering/ci-and-quality-gates.md)
- [Subagent Worktree Protocol](../../engineering/subagent-worktree-protocol.md)

## Dependency contract

- **Depends on:** [M0-004](../m0/M0-004-establish-ci-skeleton-and-one-verification-command.md), [M4-GATE](../m4/M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md)
- **Blocks:** [M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md), [M6-006](../m6/M6-006-finalize-the-supported-bun-1-4-compatibility-matrix.md)
- **Global wave:** 38
- **Milestone wave:** 1
- **Conflict group:** `shared-ci`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Run unit/integration/conformance/client/package suites on supported hosted runners.
- Test pinned and latest compatible Bun 1.4 patch where feasible.
- Record platform-specific skips with reasons.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
.github/workflows/compatibility.yml
scripts/compatibility-report.ts
docs/reports/m5-compatibility.md
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
git worktree add ".worktrees/M5-010" -b "agent/M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-w" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Run unit/integration/conformance/client/package suites on supported hosted runners.
5. Implement: Test pinned and latest compatible Bun 1.4 patch where feasible.
6. Implement: Record platform-specific skips with reasons.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M5-010.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Matrix report links exact runner/Bun/result for every platform.
- [ ] No platform is called supported based only on typecheck.
- [ ] Native routing differences are categorized, not patched with custom routing.
- [ ] Flaky runner failures are investigated or support is narrowed.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M5-010.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run verify:compatibility-report
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M5-010.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
