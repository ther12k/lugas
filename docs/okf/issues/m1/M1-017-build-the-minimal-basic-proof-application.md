---
type: GitHub Issue
title: M1-017 — Build the minimal basic proof application
status: draft
tags:
- github-issue
- m1
- docs
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M1-017
  milestone: M1
  milestone_title: M1 — Bun-Native Kernel
  status: backlog
  priority: P0
  size: M
  area: docs
  kind: implementation
  global_wave: 13
  milestone_wave: 7
  depends_on:
  - M1-003
  - M1-011
  - M1-015
  blocks:
  - M1-GATE
  conflict_group: examples
  owner_decision: false
  recommended_branch: agent/M1-017-build-the-minimal-basic-proof-application
  recommended_worktree: .worktrees/M1-017
  labels:
  - type:implementation
  - area:docs
  - priority:p0
  - size:m
---

# M1-017 — Build the minimal basic proof application

## Outcome

Demonstrate the public kernel using only supported syntax and native Bun features.

## Why this task exists

This task is a bounded unit in **M1 — Bun-Native Kernel**. It unlocks **[M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Ai Friendly Design](../../project/ai-friendly-design.md)
- [Documentation And Okf](../../engineering/documentation-and-okf.md)
- [Github Issue Standard](../../engineering/github-issue-standard.md)

## Dependency contract

- **Depends on:** [M1-003](M1-003-implement-text-empty-problem-and-redirect.md), [M1-011](M1-011-implement-services-and-base-request-context-typing.md), [M1-015](M1-015-implement-app-serve-and-safe-bun-option-passthrough.md)
- **Blocks:** [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md)
- **Global wave:** 13
- **Milestone wave:** 7
- **Conflict group:** `examples`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Implement health, params, JSON success, 404 problem, text, redirect, native asset, and failure fixture.
- Add README commands and expected curl outputs.
- Keep domain logic intentionally small and avoid validation/guards not yet authorized.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
examples/basic/**
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
git worktree add ".worktrees/M1-017" -b "agent/M1-017-build-the-minimal-basic-proof-application" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Implement health, params, JSON success, 404 problem, text, redirect, native asset, and failure fixture.
5. Implement: Add README commands and expected curl outputs.
6. Implement: Keep domain logic intentionally small and avoid validation/guards not yet authorized.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M1-017.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Example runs from clean install.
- [ ] Example imports only public package paths.
- [ ] Every route uses full visible paths.
- [ ] No later-milestone API is mocked or promised as working.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M1-017.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run example:basic:smoke
bun test examples/basic/**/*.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M1-017.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
