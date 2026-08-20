---
type: GitHub Issue
title: M3-GATE — Verify end-to-end client types, runtime behavior, and type cost
status: draft
tags:
- github-issue
- m3
- release
- gate
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M3-GATE
  milestone: M3
  milestone_title: M3 — Typed Contract and Client
  status: backlog
  priority: P0
  size: L
  area: release
  kind: gate
  global_wave: 29
  milestone_wave: 9
  depends_on:
  - M3-001
  - M3-002
  - M3-003
  - M3-004
  - M3-005
  - M3-006
  - M3-007
  - M3-008
  - M3-009
  - M3-010
  - M3-011
  - M3-012
  - M3-013
  - M3-014
  - M3-015
  - M3-016
  - M3-017
  - M3-018
  blocks:
  - M4-001
  - M4-005
  - M4-006
  - M4-007
  - M4-013
  - M5-005
  conflict_group: gate
  owner_decision: false
  recommended_branch: agent/M3-GATE-verify-end-to-end-client-types-runtime-behavior-
  recommended_worktree: .worktrees/M3-GATE
  labels:
  - type:gate
  - area:release
  - priority:p0
  - size:l
---

# M3-GATE — Verify end-to-end client types, runtime behavior, and type cost

## Outcome

Authorize manifest/tooling work only after the typed client is browser-safe, correct, and affordable.

## Why this task exists

This task is a bounded unit in **M3 — Typed Contract and Client**. It unlocks **[M4-001](../m4/M4-001-freeze-the-runtime-manifest-v1-schema-and-stability-policy.md), [M4-005](../m4/M4-005-create-the-stable-diagnostic-catalog-and-formatter.md), [M4-006](../m4/M4-006-implement-the-bun-native-test-server-lifecycle-helper.md), [M4-007](../m4/M4-007-integrate-the-typed-client-with-the-test-server-helper.md), [M4-013](../m4/M4-013-create-canonical-basic-validation-auth-and-client-examples.md), [M5-005](../m5/M5-005-measure-client-bundle-and-typescript-contract-cost.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Release Gates](../../delivery/release-gates.md)
- [Review Packet Standard](../../engineering/review-packet-standard.md)

## Dependency contract

- **Depends on:** [M3-001](M3-001-extract-the-application-route-contract-type.md), [M3-002](M3-002-derive-method-specific-path-and-input-lookup-types.md), [M3-003](M3-003-extract-status-and-body-response-unions.md), [M3-004](M3-004-merge-guard-responses-into-client-outcome-types.md), [M3-005](M3-005-generate-25-100-500-and-1-000-route-type-fixtures.md), [M3-006](M3-006-implement-createclient-base-configuration-and-fetch-injection.md), [M3-007](M3-007-add-typed-explicit-http-methods-and-path-restrictions.md), [M3-008](M3-008-implement-path-parameter-interpolation-and-encoding.md), [M3-009](M3-009-implement-query-serialization-matching-server-decoding.md), [M3-010](M3-010-implement-headers-json-body-and-requestinit-merging.md), [M3-011](M3-011-parse-http-responses-into-discriminated-client-results.md), [M3-012](M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md), [M3-013](M3-013-preserve-network-abort-and-raw-fetch-failure-behavior.md), [M3-014](M3-014-prove-the-client-export-is-browser-safe-and-bun-free.md), [M3-015](M3-015-close-the-client-unit-and-adversarial-matrix.md), [M3-016](M3-016-prove-full-server-to-client-contract-behavior.md), [M3-017](M3-017-establish-the-typescript-performance-gate-and-fallback-policy.md), [M3-018](M3-018-finalize-lugas-client-exports-and-packed-consumer-tests.md)
- **Blocks:** [M4-001](../m4/M4-001-freeze-the-runtime-manifest-v1-schema-and-stability-policy.md), [M4-005](../m4/M4-005-create-the-stable-diagnostic-catalog-and-formatter.md), [M4-006](../m4/M4-006-implement-the-bun-native-test-server-lifecycle-helper.md), [M4-007](../m4/M4-007-integrate-the-typed-client-with-the-test-server-helper.md), [M4-013](../m4/M4-013-create-canonical-basic-validation-auth-and-client-examples.md), [M5-005](../m5/M5-005-measure-client-bundle-and-typescript-contract-cost.md)
- **Global wave:** 29
- **Milestone wave:** 9
- **Conflict group:** `gate`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Reproduce client unit/integration/browser/package/typebench evidence.
- Review HTTP versus transport failure semantics and raw-response widening.
- Confirm no Eden dependency, Proxy tree, or Bun runtime import entered the client.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
docs/reports/gates/M3.md
docs/okf/log.md
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
git worktree add ".worktrees/M3-GATE" -b "agent/M3-GATE-verify-end-to-end-client-types-runtime-behavior-" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Reproduce client unit/integration/browser/package/typebench evidence.
5. Implement: Review HTTP versus transport failure semantics and raw-response widening.
6. Implement: Confirm no Eden dependency, Proxy tree, or Bun runtime import entered the client.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M3-GATE.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] All M3 issues are merged with evidence.
- [ ] 500-route type gate is accepted and 1,000-route results disclosed.
- [ ] Packed browser client works from clean consumer.
- [ ] Server/client runtime matrix is green.
- [ ] M4 can rely on a stable app/client contract.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M3-GATE.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run verify
bun run test:client
bun run typebench:all
bun run package:dry-run
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M3-GATE.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
