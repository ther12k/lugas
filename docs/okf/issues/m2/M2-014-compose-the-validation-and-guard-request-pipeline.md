---
type: GitHub Issue
title: M2-014 — Compose the validation and guard request pipeline
status: draft
tags:
- github-issue
- m2
- routing
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M2-014
  milestone: M2
  milestone_title: M2 — Validation and Guards
  status: backlog
  priority: P0
  size: L
  area: routing
  kind: implementation
  global_wave: 18
  milestone_wave: 4
  depends_on:
  - M2-003
  - M2-005
  - M2-006
  - M2-008
  - M2-013
  blocks:
  - M2-016
  - M2-017
  - M2-018
  - M2-GATE
  conflict_group: routing-compiler
  owner_decision: false
  recommended_branch: agent/M2-014-compose-the-validation-and-guard-request-pipelin
  recommended_worktree: .worktrees/M2-014
  labels:
  - type:implementation
  - area:routing
  - priority:p0
  - size:l
---

# M2-014 — Compose the validation and guard request pipeline

## Outcome

Compile per-route input and guard capabilities into one deterministic handler without unused work.

## Why this task exists

This task is a bounded unit in **M2 — Validation and Guards**. It unlocks **[M2-016](M2-016-build-validation-and-guard-proof-applications.md), [M2-017](M2-017-run-malformed-request-and-adversarial-validation-matrix.md), [M2-018](M2-018-close-route-context-and-guard-type-tests.md), [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Routing And Compilation](../../architecture/routing-and-compilation.md)
- [Bun Compatibility](../../architecture/bun-compatibility.md)
- [0004 Bun Native Router Authoritative](../../decisions/0004-bun-native-router-authoritative.md)

## Dependency contract

- **Depends on:** [M2-003](M2-003-add-params-validation-and-transformed-output.md), [M2-005](M2-005-add-query-validation-and-inferred-output.md), [M2-006](M2-006-add-lower-case-header-projection-and-validation.md), [M2-008](M2-008-add-json-body-validation-and-transformed-output.md), [M2-013](M2-013-close-multi-guard-ordering-collision-and-failure-semantics.md)
- **Blocks:** [M2-016](M2-016-build-validation-and-guard-proof-applications.md), [M2-017](M2-017-run-malformed-request-and-adversarial-validation-matrix.md), [M2-018](M2-018-close-route-context-and-guard-type-tests.md), [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)
- **Global wave:** 18
- **Milestone wave:** 4
- **Conflict group:** `routing-compiler`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Select only declared decoders/validators and ordered guards at startup.
- Build context fields after successful validation.
- Preserve sync fast paths for fully synchronous routes.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/internal/compile-route.ts
src/internal/compile-pipeline.ts
tests/integration/request-pipeline.test.ts
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
git worktree add ".worktrees/M2-014" -b "agent/M2-014-compose-the-validation-and-guard-request-pipelin" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Select only declared decoders/validators and ordered guards at startup.
5. Implement: Build context fields after successful validation.
6. Implement: Preserve sync fast paths for fully synchronous routes.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M2-014.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Lifecycle is validation then guards then handler.
- [ ] No undeclared decoder/validator is called, proven by spies/counters.
- [ ] Validation stop skips all guards/handler; guard stop skips handler.
- [ ] Mixed async stages settle exactly once and propagate abort/error correctly.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M2-014.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/integration/request-pipeline.test.ts
bun run bench:pipeline:smoke
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M2-014.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
