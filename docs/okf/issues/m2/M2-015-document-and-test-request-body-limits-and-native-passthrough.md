---
type: GitHub Issue
title: M2-015 — Document and test request body limits and native passthrough
status: draft
tags:
- github-issue
- m2
- security
- test
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M2-015
  milestone: M2
  milestone_title: M2 — Validation and Guards
  status: backlog
  priority: P0
  size: M
  area: security
  kind: test
  global_wave: 16
  milestone_wave: 2
  depends_on:
  - M2-007
  - M1-015
  blocks:
  - M2-GATE
  conflict_group: security-fixtures
  owner_decision: false
  recommended_branch: agent/M2-015-document-and-test-request-body-limits-and-native
  recommended_worktree: .worktrees/M2-015
  labels:
  - type:test
  - area:security
  - priority:p0
  - size:m
---

# M2-015 — Document and test request body limits and native passthrough

## Outcome

Clarify Lugas versus Bun responsibility for body limits, streams, and undeclared body access.

## Why this task exists

This task is a bounded unit in **M2 — Validation and Guards**. It unlocks **[M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Security And Threat Model](../../engineering/security-and-threat-model.md)
- [Dependency And Supply Chain](../../engineering/dependency-and-supply-chain.md)

## Dependency contract

- **Depends on:** [M2-007](M2-007-implement-json-media-type-and-malformed-body-parsing-policy.md), [M1-015](../m1/M1-015-implement-app-serve-and-safe-bun-option-passthrough.md)
- **Blocks:** [M2-GATE](M2-GATE-verify-validation-guards-security-and-context-contracts.md)
- **Global wave:** 16
- **Milestone wave:** 2
- **Conflict group:** `security-fixtures`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Test configured Bun maximum body behavior for declared JSON routes.
- Test native stream/form/text parsing on routes without a body schema.
- Document that Lugas does not implement a second buffering limit.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
tests/security/body-limits.test.ts
tests/integration/native-body-passthrough.test.ts
docs/body-limits.md
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
git worktree add ".worktrees/M2-015" -b "agent/M2-015-document-and-test-request-body-limits-and-native" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Test configured Bun maximum body behavior for declared JSON routes.
5. Implement: Test native stream/form/text parsing on routes without a body schema.
6. Implement: Document that Lugas does not implement a second buffering limit.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M2-015.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Oversize behavior is recorded for the pinned Bun version.
- [ ] Undeclared-body routes retain normal native request access.
- [ ] Lugas errors do not include partial raw body.
- [ ] Docs give a secure server configuration example without claiming universal protection.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M2-015.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/security/body-limits.test.ts
bun test tests/integration/native-body-passthrough.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M2-015.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
