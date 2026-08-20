---
type: GitHub Issue
title: M3-015 — Close the client unit and adversarial matrix
status: draft
tags:
- github-issue
- m3
- testing
- test
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M3-015
  milestone: M3
  milestone_title: M3 — Typed Contract and Client
  status: backlog
  priority: P0
  size: L
  area: testing
  kind: test
  global_wave: 27
  milestone_wave: 7
  depends_on:
  - M3-008
  - M3-009
  - M3-010
  - M3-011
  - M3-012
  - M3-013
  blocks:
  - M3-016
  - M3-GATE
  conflict_group: client-tests
  owner_decision: false
  recommended_branch: agent/M3-015-close-the-client-unit-and-adversarial-matrix
  recommended_worktree: .worktrees/M3-015
  labels:
  - type:test
  - area:testing
  - priority:p0
  - size:l
---

# M3-015 — Close the client unit and adversarial matrix

## Outcome

Test URL construction, request serialization, response parsing, and failure behavior independently of the server.

## Why this task exists

This task is a bounded unit in **M3 — Typed Contract and Client**. It unlocks **[M3-016](M3-016-prove-full-server-to-client-contract-behavior.md), [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Testing Interface](../../architecture/testing-interface.md)
- [Testing Strategy](../../engineering/testing-strategy.md)
- [Conformance Matrix](../../engineering/conformance-matrix.md)

## Dependency contract

- **Depends on:** [M3-008](M3-008-implement-path-parameter-interpolation-and-encoding.md), [M3-009](M3-009-implement-query-serialization-matching-server-decoding.md), [M3-010](M3-010-implement-headers-json-body-and-requestinit-merging.md), [M3-011](M3-011-parse-http-responses-into-discriminated-client-results.md), [M3-012](M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md), [M3-013](M3-013-preserve-network-abort-and-raw-fetch-failure-behavior.md)
- **Blocks:** [M3-016](M3-016-prove-full-server-to-client-contract-behavior.md), [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)
- **Global wave:** 27
- **Milestone wave:** 7
- **Conflict group:** `client-tests`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Use table-driven cases for methods, params, queries, headers, bodies, media types, and statuses.
- Include Unicode, reserved characters, missing runtime values, malformed response, and abort cases.
- Verify injected fetch receives exact requests.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
tests/client/**
docs/reports/m3-client-matrix.md
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
git worktree add ".worktrees/M3-015" -b "agent/M3-015-close-the-client-unit-and-adversarial-matrix" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Use table-driven cases for methods, params, queries, headers, bodies, media types, and statuses.
5. Implement: Include Unicode, reserved characters, missing runtime values, malformed response, and abort cases.
6. Implement: Verify injected fetch receives exact requests.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M3-015.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Every M3 runtime client criterion maps to a unit/security test.
- [ ] No snapshot hides important URL/header differences.
- [ ] Tests are deterministic and do not require public internet.
- [ ] Unknown media/status behavior is explicit.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M3-015.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run test:client
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M3-015.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
