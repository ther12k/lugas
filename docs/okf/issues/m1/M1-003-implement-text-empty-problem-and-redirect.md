---
type: GitHub Issue
title: M1-003 — Implement `text`, `empty`, `problem`, and `redirect`
status: draft
tags:
- github-issue
- m1
- responses
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M1-003
  milestone: M1
  milestone_title: M1 — Bun-Native Kernel
  status: backlog
  priority: P0
  size: M
  area: responses
  kind: implementation
  global_wave: 9
  milestone_wave: 3
  depends_on:
  - M1-002
  blocks:
  - M1-014
  - M1-016
  - M1-017
  - M1-018
  - M1-GATE
  - M2-002
  - M3-003
  - M3-012
  conflict_group: responses
  owner_decision: false
  recommended_branch: agent/M1-003-implement-text-empty-problem-and-redirect
  recommended_worktree: .worktrees/M1-003
  labels:
  - type:implementation
  - area:responses
  - priority:p0
  - size:m
---

# M1-003 — Implement `text`, `empty`, `problem`, and `redirect`

## Outcome

Complete the minimal typed response helper set and standard Problem Details wire format.

## Why this task exists

This task is a bounded unit in **M1 — Bun-Native Kernel**. It unlocks **[M1-014](M1-014-implement-default-not-found-and-unexpected-error-policies.md), [M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-017](M1-017-build-the-minimal-basic-proof-application.md), [M1-018](M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M2-002](../m2/M2-002-normalize-validation-issues-safely.md), [M3-003](../m3/M3-003-extract-status-and-body-response-unions.md), [M3-012](../m3/M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Responses And Errors](../../architecture/responses-and-errors.md)
- [Route Contract](../../architecture/route-contract.md)
- [0006 Native Response Typed Helpers](../../decisions/0006-native-response-typed-helpers.md)

## Dependency contract

- **Depends on:** [M1-002](M1-002-implement-typed-response-branding-and-json.md)
- **Blocks:** [M1-014](M1-014-implement-default-not-found-and-unexpected-error-policies.md), [M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-017](M1-017-build-the-minimal-basic-proof-application.md), [M1-018](M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md), [M1-GATE](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md), [M2-002](../m2/M2-002-normalize-validation-issues-safely.md), [M3-003](../m3/M3-003-extract-status-and-body-response-unions.md), [M3-012](../m3/M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md)
- **Global wave:** 9
- **Milestone wave:** 3
- **Conflict group:** `responses`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Implement text and bodyless responses.
- Implement RFC 9457-compatible problems with bounded extension validation.
- Implement redirects with constrained status semantics.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/core/response.ts
tests/unit/response-helpers.test.ts
tests/types/response-helpers.test-d.ts
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
git worktree add ".worktrees/M1-003" -b "agent/M1-003-implement-text-empty-problem-and-redirect" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Implement text and bodyless responses.
5. Implement: Implement RFC 9457-compatible problems with bounded extension validation.
6. Implement: Implement redirects with constrained status semantics.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M1-003.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Problem response uses `application/problem+json` and mirrors HTTP status in the body.
- [ ] `empty(204)` emits no serialized body.
- [ ] Invalid/problem reserved field collisions fail predictably.
- [ ] Helpers preserve native clone/header behavior and exact type contracts.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M1-003.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/unit/response-helpers.test.ts
bun run test:types
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M1-003.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
