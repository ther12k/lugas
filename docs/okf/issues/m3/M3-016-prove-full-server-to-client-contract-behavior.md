---
type: GitHub Issue
title: M3-016 — Prove full server-to-client contract behavior
status: draft
tags:
- github-issue
- m3
- testing
- integration
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M3-016
  milestone: M3
  milestone_title: M3 — Typed Contract and Client
  status: backlog
  priority: P0
  size: L
  area: testing
  kind: integration
  global_wave: 28
  milestone_wave: 8
  depends_on:
  - M2-GATE
  - M3-015
  blocks:
  - M3-GATE
  conflict_group: client-integration
  owner_decision: false
  recommended_branch: agent/M3-016-prove-full-server-to-client-contract-behavior
  recommended_worktree: .worktrees/M3-016
  labels:
  - type:integration
  - area:testing
  - priority:p0
  - size:l
---

# M3-016 — Prove full server-to-client contract behavior

## Outcome

Use the real Lugas server and client together for validation, guards, domain problems, success, empty, text, and abort paths.

## Why this task exists

This task is a bounded unit in **M3 — Typed Contract and Client**. It unlocks **[M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Testing Interface](../../architecture/testing-interface.md)
- [Testing Strategy](../../engineering/testing-strategy.md)
- [Conformance Matrix](../../engineering/conformance-matrix.md)

## Dependency contract

- **Depends on:** [M2-GATE](../m2/M2-GATE-verify-validation-guards-security-and-context-contracts.md), [M3-015](M3-015-close-the-client-unit-and-adversarial-matrix.md)
- **Blocks:** [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)
- **Global wave:** 28
- **Milestone wave:** 8
- **Conflict group:** `client-integration`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Create integration fixture from public exports.
- Inject ephemeral server fetch or base URL through one client implementation.
- Compare compile-time expectations with exact runtime response status/body.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
tests/integration/server-client/**
examples/client/**
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
git worktree add ".worktrees/M3-016" -b "agent/M3-016-prove-full-server-to-client-contract-behavior" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Create integration fixture from public exports.
5. Implement: Inject ephemeral server fetch or base URL through one client implementation.
6. Implement: Compare compile-time expectations with exact runtime response status/body.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M3-016.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] 200/201/204/400/401/403/404/409/415/422/500 scenarios behave as documented.
- [ ] Client path/query/body round-trip matches server decoding.
- [ ] Abort/slow route cleans up without handler completion where observable.
- [ ] Type tests and runtime tests share the same application definition.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M3-016.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/integration/server-client
bun run example:client:smoke
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M3-016.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
