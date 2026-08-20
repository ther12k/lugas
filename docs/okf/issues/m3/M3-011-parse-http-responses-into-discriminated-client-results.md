---
type: GitHub Issue
title: M3-011 — Parse HTTP responses into discriminated client results
status: draft
tags:
- github-issue
- m3
- client
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M3-011
  milestone: M3
  milestone_title: M3 — Typed Contract and Client
  status: backlog
  priority: P0
  size: L
  area: client
  kind: implementation
  global_wave: 25
  milestone_wave: 5
  depends_on:
  - M3-003
  - M3-007
  blocks:
  - M3-012
  - M3-013
  - M3-014
  - M3-015
  - M3-GATE
  conflict_group: client-runtime
  owner_decision: false
  recommended_branch: agent/M3-011-parse-http-responses-into-discriminated-client-r
  recommended_worktree: .worktrees/M3-011
  labels:
  - type:implementation
  - area:client
  - priority:p0
  - size:l
---

# M3-011 — Parse HTTP responses into discriminated client results

## Outcome

Return `ok: true/false` results keyed by actual HTTP status while retaining the native Response.

## Why this task exists

This task is a bounded unit in **M3 — Typed Contract and Client**. It unlocks **[M3-012](M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md), [M3-013](M3-013-preserve-network-abort-and-raw-fetch-failure-behavior.md), [M3-014](M3-014-prove-the-client-export-is-browser-safe-and-bun-free.md), [M3-015](M3-015-close-the-client-unit-and-adversarial-matrix.md), [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Typed Client](../../architecture/typed-client.md)
- [0009 Own Explicit Typed Client](../../decisions/0009-own-explicit-typed-client.md)

## Dependency contract

- **Depends on:** [M3-003](M3-003-extract-status-and-body-response-unions.md), [M3-007](M3-007-add-typed-explicit-http-methods-and-path-restrictions.md)
- **Blocks:** [M3-012](M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md), [M3-013](M3-013-preserve-network-abort-and-raw-fetch-failure-behavior.md), [M3-014](M3-014-prove-the-client-export-is-browser-safe-and-bun-free.md), [M3-015](M3-015-close-the-client-unit-and-adversarial-matrix.md), [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)
- **Global wave:** 25
- **Milestone wave:** 5
- **Conflict group:** `client-runtime`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Use `Response.ok` and actual status, not inferred expectation, for runtime branch.
- Parse media types through dedicated helpers.
- Attach original response to every result and preserve headers.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/client/parse-response.ts
src/client/types.ts
tests/unit/client-result.test.ts
tests/types/client-result.test-d.ts
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
git worktree add ".worktrees/M3-011" -b "agent/M3-011-parse-http-responses-into-discriminated-client-r" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Use `Response.ok` and actual status, not inferred expectation, for runtime branch.
5. Implement: Parse media types through dedicated helpers.
6. Implement: Attach original response to every result and preserve headers.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M3-011.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] 2xx becomes success and 4xx/5xx becomes failure without throwing.
- [ ] Known statuses narrow to typed body/error unions.
- [ ] Unknown/raw route results remain safe unknown values.
- [ ] Response remains available after parsing according to clone/body policy.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M3-011.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/unit/client-result.test.ts
bun run test:types:client
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M3-011.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
