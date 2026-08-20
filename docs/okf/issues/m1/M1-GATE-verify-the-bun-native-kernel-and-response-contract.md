---
type: GitHub Issue
title: M1-GATE — Verify the Bun-native kernel and response contract
status: draft
tags:
- github-issue
- m1
- release
- gate
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M1-GATE
  milestone: M1
  milestone_title: M1 — Bun-Native Kernel
  status: backlog
  priority: P0
  size: L
  area: release
  kind: gate
  global_wave: 14
  milestone_wave: 8
  depends_on:
  - M1-001
  - M1-002
  - M1-003
  - M1-004
  - M1-005
  - M1-006
  - M1-007
  - M1-008
  - M1-009
  - M1-010
  - M1-011
  - M1-012
  - M1-013
  - M1-014
  - M1-015
  - M1-016
  - M1-017
  - M1-018
  blocks:
  - M2-001
  - M2-004
  - M2-007
  - M2-010
  - M3-001
  - M4-001
  - M5-001
  - M5-004
  conflict_group: gate
  owner_decision: false
  recommended_branch: agent/M1-GATE-verify-the-bun-native-kernel-and-response-contra
  recommended_worktree: .worktrees/M1-GATE
  labels:
  - type:gate
  - area:release
  - priority:p0
  - size:l
---

# M1-GATE — Verify the Bun-native kernel and response contract

## Outcome

Authorize validation/guard work only after the minimal kernel is independently reproducible.

## Why this task exists

This task is a bounded unit in **M1 — Bun-Native Kernel**. It unlocks **[M2-001](../m2/M2-001-implement-the-standard-schema-executor-and-dependency-decision.md), [M2-004](../m2/M2-004-define-and-implement-deterministic-query-decoding.md), [M2-007](../m2/M2-007-implement-json-media-type-and-malformed-body-parsing-policy.md), [M2-010](../m2/M2-010-execute-guards-with-sync-path-and-response-short-circuit.md), [M3-001](../m3/M3-001-extract-the-application-route-contract-type.md), [M4-001](../m4/M4-001-freeze-the-runtime-manifest-v1-schema-and-stability-policy.md), [M5-001](../m5/M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md), [M5-004](../m5/M5-004-measure-1-000-and-10-000-route-startup-and-memory.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Release Gates](../../delivery/release-gates.md)
- [Review Packet Standard](../../engineering/review-packet-standard.md)

## Dependency contract

- **Depends on:** [M1-001](M1-001-create-the-core-public-and-internal-type-skeleton.md), [M1-002](M1-002-implement-typed-response-branding-and-json.md), [M1-003](M1-003-implement-text-empty-problem-and-redirect.md), [M1-004](M1-004-implement-the-route-descriptor-factory-and-local-invariants.md), [M1-005](M1-005-implement-named-guard-descriptors-and-metadata.md), [M1-006](M1-006-implement-named-module-route-containers.md), [M1-007](M1-007-implement-the-defineapp-validation-and-composition-shell.md), [M1-008](M1-008-classify-and-preserve-native-bun-route-entries.md), [M1-009](M1-009-compile-lugas-descriptors-into-bun-handlers.md), [M1-010](M1-010-preserve-the-synchronous-route-fast-path.md), [M1-011](M1-011-implement-services-and-base-request-context-typing.md), [M1-012](M1-012-reject-duplicate-routes-and-module-ownership-conflicts.md), [M1-013](M1-013-validate-route-path-and-params-declaration-consistency.md), [M1-014](M1-014-implement-default-not-found-and-unexpected-error-policies.md), [M1-015](M1-015-implement-app-serve-and-safe-bun-option-passthrough.md), [M1-016](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md), [M1-017](M1-017-build-the-minimal-basic-proof-application.md), [M1-018](M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md)
- **Blocks:** [M2-001](../m2/M2-001-implement-the-standard-schema-executor-and-dependency-decision.md), [M2-004](../m2/M2-004-define-and-implement-deterministic-query-decoding.md), [M2-007](../m2/M2-007-implement-json-media-type-and-malformed-body-parsing-policy.md), [M2-010](../m2/M2-010-execute-guards-with-sync-path-and-response-short-circuit.md), [M3-001](../m3/M3-001-extract-the-application-route-contract-type.md), [M4-001](../m4/M4-001-freeze-the-runtime-manifest-v1-schema-and-stability-policy.md), [M5-001](../m5/M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md), [M5-004](../m5/M5-004-measure-1-000-and-10-000-route-startup-and-memory.md)
- **Global wave:** 14
- **Milestone wave:** 8
- **Conflict group:** `gate`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Run M1 tests and package smoke from clean checkout.
- Review public API count, native route conformance, error redaction, and sync-path evidence.
- Confirm no custom router, hidden module scope, or later feature entered the core.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
docs/reports/gates/M1.md
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
git worktree add ".worktrees/M1-GATE" -b "agent/M1-GATE-verify-the-bun-native-kernel-and-response-contra" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Run M1 tests and package smoke from clean checkout.
5. Implement: Review public API count, native route conformance, error redaction, and sync-path evidence.
6. Implement: Confirm no custom router, hidden module scope, or later feature entered the core.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M1-GATE.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] All M1 issues and evidence are merged.
- [ ] Basic proof app works and package tarball consumer passes.
- [ ] Native pass-through matrix is green.
- [ ] Core public symbols and dependencies remain within budget.
- [ ] M2 ownership/dependencies are valid.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M1-GATE.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun install --frozen-lockfile
bun run verify
bun run test:m1
bun run package:dry-run
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M1-GATE.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
