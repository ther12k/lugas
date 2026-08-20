---
type: GitHub Issue
title: M4-GATE — Verify manifest truth, testing, CLI, examples, and agent documentation
status: draft
tags:
- github-issue
- m4
- release
- gate
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M4-GATE
  milestone: M4
  milestone_title: M4 — Manifest, Tooling, and Agent DX
  status: backlog
  priority: P0
  size: L
  area: release
  kind: gate
  global_wave: 37
  milestone_wave: 8
  depends_on:
  - M4-001
  - M4-002
  - M4-003
  - M4-004
  - M4-005
  - M4-006
  - M4-007
  - M4-008
  - M4-009
  - M4-010
  - M4-011
  - M4-012
  - M4-013
  - M4-014
  - M4-015
  - M4-016
  - M4-017
  blocks:
  - M5-001
  - M5-006
  - M5-008
  - M5-009
  - M5-010
  - M5-011
  - M5-012
  - M5-013
  - M5-015
  - M5-016
  conflict_group: gate
  owner_decision: false
  recommended_branch: agent/M4-GATE-verify-manifest-truth-testing-cli-examples-and-a
  recommended_worktree: .worktrees/M4-GATE
  labels:
  - type:gate
  - area:release
  - priority:p0
  - size:l
---

# M4-GATE — Verify manifest truth, testing, CLI, examples, and agent documentation

## Outcome

Authorize alpha hardening only after the framework is inspectable, testable, documented, and agent-operable.

## Why this task exists

This task is a bounded unit in **M4 — Manifest, Tooling, and Agent DX**. It unlocks **[M5-001](../m5/M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md), [M5-006](../m5/M5-006-integrate-bun-cpu-heap-and-metafile-diagnostics.md), [M5-008](../m5/M5-008-perform-the-full-malformed-input-and-redaction-security-review.md), [M5-009](../m5/M5-009-audit-dependencies-licenses-package-contents-and-sbom.md), [M5-010](../m5/M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-windows.md), [M5-011](../m5/M5-011-close-static-file-directory-and-native-passthrough-security-tests.md), [M5-012](../m5/M5-012-stress-synchronous-and-asynchronous-guards-and-validators.md), [M5-013](../m5/M5-013-stress-cancellation-abort-slow-bodies-and-client-transport.md), [M5-015](../m5/M5-015-review-api-consistency-against-principles-and-elysia-lessons.md), [M5-016](../m5/M5-016-build-the-production-shaped-crud-proof-api.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Release Gates](../../delivery/release-gates.md)
- [Review Packet Standard](../../engineering/review-packet-standard.md)

## Dependency contract

- **Depends on:** [M4-001](M4-001-freeze-the-runtime-manifest-v1-schema-and-stability-policy.md), [M4-002](M4-002-capture-module-path-method-and-route-kind-metadata.md), [M4-003](M4-003-capture-validation-capabilities-and-ordered-guard-names-truthfully.md), [M4-004](M4-004-expose-readonly-app-manifest-and-deterministic-json.md), [M4-005](M4-005-create-the-stable-diagnostic-catalog-and-formatter.md), [M4-006](M4-006-implement-the-bun-native-test-server-lifecycle-helper.md), [M4-007](M4-007-integrate-the-typed-client-with-the-test-server-helper.md), [M4-008](M4-008-close-test-server-cleanup-failure-and-leak-behavior.md), [M4-009](M4-009-lock-diagnostic-and-manifest-golden-contracts.md), [M4-010](M4-010-spike-safe-application-import-for-cli-inspection.md), [M4-011](M4-011-implement-lugas-routes-and-lugas-inspect-json.md), [M4-012](M4-012-test-cli-no-server-start-timeout-and-process-exit-guarantees.md), [M4-013](M4-013-create-canonical-basic-validation-auth-and-client-examples.md), [M4-014](M4-014-generate-concise-llms-txt-from-canonical-concepts.md), [M4-015](M4-015-generate-full-agent-reference-and-lugas-skill-document.md), [M4-016](M4-016-finalize-repository-agents-and-evidence-enforcement.md), [M4-017](M4-017-finalize-lugas-testing-and-cli-package-exports.md)
- **Blocks:** [M5-001](../m5/M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md), [M5-006](../m5/M5-006-integrate-bun-cpu-heap-and-metafile-diagnostics.md), [M5-008](../m5/M5-008-perform-the-full-malformed-input-and-redaction-security-review.md), [M5-009](../m5/M5-009-audit-dependencies-licenses-package-contents-and-sbom.md), [M5-010](../m5/M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-windows.md), [M5-011](../m5/M5-011-close-static-file-directory-and-native-passthrough-security-tests.md), [M5-012](../m5/M5-012-stress-synchronous-and-asynchronous-guards-and-validators.md), [M5-013](../m5/M5-013-stress-cancellation-abort-slow-bodies-and-client-transport.md), [M5-015](../m5/M5-015-review-api-consistency-against-principles-and-elysia-lessons.md), [M5-016](../m5/M5-016-build-the-production-shaped-crud-proof-api.md)
- **Global wave:** 37
- **Milestone wave:** 8
- **Conflict group:** `gate`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Reproduce manifest/diagnostic goldens, test-server cleanup, CLI safety, examples, packed exports, and generated agent docs.
- Audit manifest fields against runtime truth rule.
- Run a small independent agent review of one documentation-guided change.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
docs/reports/gates/M4.md
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
git worktree add ".worktrees/M4-GATE" -b "agent/M4-GATE-verify-manifest-truth-testing-cli-examples-and-a" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Reproduce manifest/diagnostic goldens, test-server cleanup, CLI safety, examples, packed exports, and generated agent docs.
5. Implement: Audit manifest fields against runtime truth rule.
6. Implement: Run a small independent agent review of one documentation-guided change.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M4-GATE.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] All M4 issues are merged with evidence.
- [ ] Manifest contains no erased type claims.
- [ ] Testing/CLI exports pass package boundaries.
- [ ] Generated docs are current and clean-room reviewer can locate canonical API.
- [ ] M5 hardening tasks are dependency-ready.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M4-GATE.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run verify
bun run test:m4
bun run test:examples
bun run package:dry-run
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M4-GATE.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
