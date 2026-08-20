---
type: GitHub Issue
title: M5-017 — Assemble the private alpha review and release packet
status: draft
tags:
- github-issue
- m5
- release
- release
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M5-017
  milestone: M5
  milestone_title: M5 — Hardening and Private Alpha
  status: backlog
  priority: P0
  size: L
  area: release
  kind: release
  global_wave: 41
  milestone_wave: 4
  depends_on:
  - M5-002
  - M5-003
  - M5-004
  - M5-005
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
  blocks:
  - M5-GATE
  - M6-003
  conflict_group: release-packet
  owner_decision: false
  recommended_branch: agent/M5-017-assemble-the-private-alpha-review-and-release-pa
  recommended_worktree: .worktrees/M5-017
  labels:
  - type:release
  - area:release
  - priority:p0
  - size:l
---

# M5-017 — Assemble the private alpha review and release packet

## Outcome

Produce a self-verifying private alpha packet without publishing public packages or claims.

## Why this task exists

This task is a bounded unit in **M5 — Hardening and Private Alpha**. It unlocks **[M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md), [M6-003](../m6/M6-003-run-package-publication-dry-run-and-provenance-rehearsal.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Release Gates](../../delivery/release-gates.md)
- [Review Packet Standard](../../engineering/review-packet-standard.md)

## Dependency contract

- **Depends on:** [M5-002](M5-002-measure-raw-bun-versus-lugas-plain-route-overhead.md), [M5-003](M5-003-measure-feature-equivalent-validation-and-guard-pipelines.md), [M5-004](M5-004-measure-1-000-and-10-000-route-startup-and-memory.md), [M5-005](M5-005-measure-client-bundle-and-typescript-contract-cost.md), [M5-007](M5-007-install-performance-size-and-type-regression-gates.md), [M5-008](M5-008-perform-the-full-malformed-input-and-redaction-security-review.md), [M5-009](M5-009-audit-dependencies-licenses-package-contents-and-sbom.md), [M5-010](M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-windows.md), [M5-011](M5-011-close-static-file-directory-and-native-passthrough-security-tests.md), [M5-012](M5-012-stress-synchronous-and-asynchronous-guards-and-validators.md), [M5-013](M5-013-stress-cancellation-abort-slow-bodies-and-client-transport.md), [M5-014](M5-014-run-10-000-route-runtime-and-type-stress-closure.md), [M5-015](M5-015-review-api-consistency-against-principles-and-elysia-lessons.md), [M5-016](M5-016-build-the-production-shaped-crud-proof-api.md)
- **Blocks:** [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md), [M6-003](../m6/M6-003-run-package-publication-dry-run-and-provenance-rehearsal.md)
- **Global wave:** 41
- **Milestone wave:** 4
- **Conflict group:** `release-packet`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Create clean source archive/package dry run, checksums, commit, evidence index, compatibility/security/performance summaries.
- List open limitations and owner decisions.
- Verify all commands from a clean checkout.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
docs/releases/alpha/**
scripts/build-alpha-packet.ts
artifacts/.gitkeep
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
git worktree add ".worktrees/M5-017" -b "agent/M5-017-assemble-the-private-alpha-review-and-release-pa" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Create clean source archive/package dry run, checksums, commit, evidence index, compatibility/security/performance summaries.
5. Implement: List open limitations and owner decisions.
6. Implement: Verify all commands from a clean checkout.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M5-017.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Packet inventory and SHA-256 are reproducible.
- [ ] No P0/P1 defect or security finding remains open.
- [ ] Performance/type results are labeled measured and limited to scenarios.
- [ ] No registry/public repository action occurs.
- [ ] Exact alpha stop point is explicit.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M5-017.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run release:alpha:dry-run
bun run verify
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M5-017.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
