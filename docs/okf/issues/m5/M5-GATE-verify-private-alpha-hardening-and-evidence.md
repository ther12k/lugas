---
type: GitHub Issue
title: M5-GATE — Verify private alpha hardening and evidence
status: draft
tags:
- github-issue
- m5
- release
- gate
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M5-GATE
  milestone: M5
  milestone_title: M5 — Hardening and Private Alpha
  status: backlog
  priority: P0
  size: L
  area: release
  kind: gate
  global_wave: 42
  milestone_wave: 5
  depends_on:
  - M5-001
  - M5-002
  - M5-003
  - M5-004
  - M5-005
  - M5-006
  - M5-007
  - M5-008
  - M5-009
  - M5-010
  - M5-011
  - M5-012
  - M5-013
  - M5-014
  - M5-015
  - M5-016
  - M5-017
  blocks:
  - M6-001
  - M6-002
  - M6-003
  - M6-004
  - M6-005
  - M6-006
  - M6-007
  - M6-008
  conflict_group: gate
  owner_decision: false
  recommended_branch: agent/M5-GATE-verify-private-alpha-hardening-and-evidence
  recommended_worktree: .worktrees/M5-GATE
  labels:
  - type:gate
  - area:release
  - priority:p0
  - size:l
---

# M5-GATE — Verify private alpha hardening and evidence

## Outcome

Decide whether the framework is technically ready to enter beta stabilization, without making public release claims.

## Why this task exists

This task is a bounded unit in **M5 — Hardening and Private Alpha**. It unlocks **[M6-001](../m6/M6-001-freeze-the-beta-public-api-candidate-and-deprecation-policy.md), [M6-002](../m6/M6-002-complete-raw-bun-and-elysia-migration-adoption-documentation.md), [M6-003](../m6/M6-003-run-package-publication-dry-run-and-provenance-rehearsal.md), [M6-004](../m6/M6-004-resolve-package-repository-organization-and-domain-ownership.md), [M6-005](../m6/M6-005-resolve-final-license-and-initial-governance.md), [M6-006](../m6/M6-006-finalize-the-supported-bun-1-4-compatibility-matrix.md), [M6-007](../m6/M6-007-triage-all-defects-and-enforce-zero-p0-p1-beta-gate.md), [M6-008](../m6/M6-008-run-an-independent-clean-room-agent-implementation-and-review.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Release Gates](../../delivery/release-gates.md)
- [Review Packet Standard](../../engineering/review-packet-standard.md)

## Dependency contract

- **Depends on:** [M5-001](M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md), [M5-002](M5-002-measure-raw-bun-versus-lugas-plain-route-overhead.md), [M5-003](M5-003-measure-feature-equivalent-validation-and-guard-pipelines.md), [M5-004](M5-004-measure-1-000-and-10-000-route-startup-and-memory.md), [M5-005](M5-005-measure-client-bundle-and-typescript-contract-cost.md), [M5-006](M5-006-integrate-bun-cpu-heap-and-metafile-diagnostics.md), [M5-007](M5-007-install-performance-size-and-type-regression-gates.md), [M5-008](M5-008-perform-the-full-malformed-input-and-redaction-security-review.md), [M5-009](M5-009-audit-dependencies-licenses-package-contents-and-sbom.md), [M5-010](M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-windows.md), [M5-011](M5-011-close-static-file-directory-and-native-passthrough-security-tests.md), [M5-012](M5-012-stress-synchronous-and-asynchronous-guards-and-validators.md), [M5-013](M5-013-stress-cancellation-abort-slow-bodies-and-client-transport.md), [M5-014](M5-014-run-10-000-route-runtime-and-type-stress-closure.md), [M5-015](M5-015-review-api-consistency-against-principles-and-elysia-lessons.md), [M5-016](M5-016-build-the-production-shaped-crud-proof-api.md), [M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md)
- **Blocks:** [M6-001](../m6/M6-001-freeze-the-beta-public-api-candidate-and-deprecation-policy.md), [M6-002](../m6/M6-002-complete-raw-bun-and-elysia-migration-adoption-documentation.md), [M6-003](../m6/M6-003-run-package-publication-dry-run-and-provenance-rehearsal.md), [M6-004](../m6/M6-004-resolve-package-repository-organization-and-domain-ownership.md), [M6-005](../m6/M6-005-resolve-final-license-and-initial-governance.md), [M6-006](../m6/M6-006-finalize-the-supported-bun-1-4-compatibility-matrix.md), [M6-007](../m6/M6-007-triage-all-defects-and-enforce-zero-p0-p1-beta-gate.md), [M6-008](../m6/M6-008-run-an-independent-clean-room-agent-implementation-and-review.md)
- **Global wave:** 42
- **Milestone wave:** 5
- **Conflict group:** `gate`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Independently reproduce alpha packet, proof API, security, compatibility, package, performance, and type evidence.
- Review every target miss and limitation.
- Authorize M6 only with zero open P0/P1 and a stable beta-candidate surface.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
docs/reports/gates/M5.md
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
git worktree add ".worktrees/M5-GATE" -b "agent/M5-GATE-verify-private-alpha-hardening-and-evidence" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Independently reproduce alpha packet, proof API, security, compatibility, package, performance, and type evidence.
5. Implement: Review every target miss and limitation.
6. Implement: Authorize M6 only with zero open P0/P1 and a stable beta-candidate surface.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M5-GATE.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] All M5 tasks/evidence are merged.
- [ ] Private alpha packet validates from clean checkout.
- [ ] Security/supply-chain/compatibility reports pass declared gates.
- [ ] Performance/type claims are evidence-bounded.
- [ ] M6 owner-decision tasks are clearly separated from technical tasks.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M5-GATE.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run release:alpha:verify
bun run verify
bun run test:proof-api
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M5-GATE.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
