---
type: GitHub Issue
title: M2-GATE — Verify validation, guards, security, and context contracts
status: draft
tags:
- github-issue
- m2
- release
- gate
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M2-GATE
  milestone: M2
  milestone_title: M2 — Validation and Guards
  status: backlog
  priority: P0
  size: L
  area: release
  kind: gate
  global_wave: 20
  milestone_wave: 6
  depends_on:
  - M2-001
  - M2-002
  - M2-003
  - M2-004
  - M2-005
  - M2-006
  - M2-007
  - M2-008
  - M2-009
  - M2-010
  - M2-011
  - M2-012
  - M2-013
  - M2-014
  - M2-015
  - M2-016
  - M2-017
  - M2-018
  blocks:
  - M3-001
  - M3-002
  - M3-016
  - M4-003
  - M4-013
  - M5-002
  - M5-003
  - M5-012
  - M5-013
  conflict_group: gate
  owner_decision: false
  recommended_branch: agent/M2-GATE-verify-validation-guards-security-and-context-co
  recommended_worktree: .worktrees/M2-GATE
  labels:
  - type:gate
  - area:release
  - priority:p0
  - size:l
---

# M2-GATE — Verify validation, guards, security, and context contracts

## Outcome

Authorize client contract work only after request semantics and typed outcomes are closed.

## Why this task exists

This task is a bounded unit in **M2 — Validation and Guards**. It unlocks **[M3-001](../m3/M3-001-extract-the-application-route-contract-type.md), [M3-002](../m3/M3-002-derive-method-specific-path-and-input-lookup-types.md), [M3-016](../m3/M3-016-prove-full-server-to-client-contract-behavior.md), [M4-003](../m4/M4-003-capture-validation-capabilities-and-ordered-guard-names-truthfully.md), [M4-013](../m4/M4-013-create-canonical-basic-validation-auth-and-client-examples.md), [M5-002](../m5/M5-002-measure-raw-bun-versus-lugas-plain-route-overhead.md), [M5-003](../m5/M5-003-measure-feature-equivalent-validation-and-guard-pipelines.md), [M5-012](../m5/M5-012-stress-synchronous-and-asynchronous-guards-and-validators.md), [M5-013](../m5/M5-013-stress-cancellation-abort-slow-bodies-and-client-transport.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Release Gates](../../delivery/release-gates.md)
- [Review Packet Standard](../../engineering/review-packet-standard.md)

## Dependency contract

- **Depends on:** [M2-001](M2-001-implement-the-standard-schema-executor-and-dependency-decision.md), [M2-002](M2-002-normalize-validation-issues-safely.md), [M2-003](M2-003-add-params-validation-and-transformed-output.md), [M2-004](M2-004-define-and-implement-deterministic-query-decoding.md), [M2-005](M2-005-add-query-validation-and-inferred-output.md), [M2-006](M2-006-add-lower-case-header-projection-and-validation.md), [M2-007](M2-007-implement-json-media-type-and-malformed-body-parsing-policy.md), [M2-008](M2-008-add-json-body-validation-and-transformed-output.md), [M2-009](M2-009-unify-request-validation-problem-details-mapping.md), [M2-010](M2-010-execute-guards-with-sync-path-and-response-short-circuit.md), [M2-011](M2-011-propagate-typed-guard-context-enrichment.md), [M2-012](M2-012-merge-guard-short-circuit-responses-into-route-contracts.md), [M2-013](M2-013-close-multi-guard-ordering-collision-and-failure-semantics.md), [M2-014](M2-014-compose-the-validation-and-guard-request-pipeline.md), [M2-015](M2-015-document-and-test-request-body-limits-and-native-passthrough.md), [M2-016](M2-016-build-validation-and-guard-proof-applications.md), [M2-017](M2-017-run-malformed-request-and-adversarial-validation-matrix.md), [M2-018](M2-018-close-route-context-and-guard-type-tests.md)
- **Blocks:** [M3-001](../m3/M3-001-extract-the-application-route-contract-type.md), [M3-002](../m3/M3-002-derive-method-specific-path-and-input-lookup-types.md), [M3-016](../m3/M3-016-prove-full-server-to-client-contract-behavior.md), [M4-003](../m4/M4-003-capture-validation-capabilities-and-ordered-guard-names-truthfully.md), [M4-013](../m4/M4-013-create-canonical-basic-validation-auth-and-client-examples.md), [M5-002](../m5/M5-002-measure-raw-bun-versus-lugas-plain-route-overhead.md), [M5-003](../m5/M5-003-measure-feature-equivalent-validation-and-guard-pipelines.md), [M5-012](../m5/M5-012-stress-synchronous-and-asynchronous-guards-and-validators.md), [M5-013](../m5/M5-013-stress-cancellation-abort-slow-bodies-and-client-transport.md)
- **Global wave:** 20
- **Milestone wave:** 6
- **Conflict group:** `gate`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Reproduce all M2 validation/guard/security/type evidence.
- Review zero-unused-work and sync-path claims.
- Confirm examples and Standard Schema compatibility from packed/public imports.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
docs/reports/gates/M2.md
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
git worktree add ".worktrees/M2-GATE" -b "agent/M2-GATE-verify-validation-guards-security-and-context-co" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Reproduce all M2 validation/guard/security/type evidence.
5. Implement: Review zero-unused-work and sync-path claims.
6. Implement: Confirm examples and Standard Schema compatibility from packed/public imports.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M2-GATE.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] All M2 issues are merged with evidence.
- [ ] 400/401/403/415/422 semantics are frozen and tested.
- [ ] Threat matrix has no open P0/P1 findings.
- [ ] Guard enrichment/response unions pass type budgets.
- [ ] M3 tasks have valid ownership and contract assumptions.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M2-GATE.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run verify
bun run test:m2
bun run test:security:m2
bun run test:types:m2
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M2-GATE.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
