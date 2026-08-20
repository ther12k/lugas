---
type: GitHub Issue
title: M0-010 — Define malformed-request and security fixture plan
status: draft
tags:
- github-issue
- m0
- security
- docs
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M0-010
  milestone: M0
  milestone_title: M0 — Design Freeze and Baselines
  status: backlog
  priority: P0
  size: M
  area: security
  kind: docs
  global_wave: 5
  milestone_wave: 5
  depends_on:
  - M0-001
  - M0-006
  blocks:
  - M0-GATE
  - M2-007
  - M2-017
  conflict_group: security-fixtures
  owner_decision: false
  recommended_branch: agent/M0-010-define-malformed-request-and-security-fixture-pl
  recommended_worktree: .worktrees/M0-010
  labels:
  - type:docs
  - area:security
  - priority:p0
  - size:m
---

# M0-010 — Define malformed-request and security fixture plan

## Outcome

Turn the threat model into an executable negative-test matrix before parsers and guards are built.

## Why this task exists

This task is a bounded unit in **M0 — Design Freeze and Baselines**. It unlocks **[M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md), [M2-007](../m2/M2-007-implement-json-media-type-and-malformed-body-parsing-policy.md), [M2-017](../m2/M2-017-run-malformed-request-and-adversarial-validation-matrix.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Security And Threat Model](../../engineering/security-and-threat-model.md)
- [Dependency And Supply Chain](../../engineering/dependency-and-supply-chain.md)

## Dependency contract

- **Depends on:** [M0-001](M0-001-freeze-the-design-baseline-and-decision-registry.md), [M0-006](M0-006-characterize-bun-native-route-and-server-semantics.md)
- **Blocks:** [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md), [M2-007](../m2/M2-007-implement-json-media-type-and-malformed-body-parsing-policy.md), [M2-017](../m2/M2-017-run-malformed-request-and-adversarial-validation-matrix.md)
- **Global wave:** 5
- **Milestone wave:** 5
- **Conflict group:** `security-fixtures`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Enumerate URL/path, query, header, JSON, abort, body-size, diagnostic-redaction, and directory-route cases.
- Define expected status/media type and what must not be logged or executed.
- Assign each case to M1–M5 tests and identify Bun-owned versus Lugas-owned behavior.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
tests/fixtures/security/README.md
docs/security-test-matrix.md
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
git worktree add ".worktrees/M0-010" -b "agent/M0-010-define-malformed-request-and-security-fixture-pl" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Enumerate URL/path, query, header, JSON, abort, body-size, diagnostic-redaction, and directory-route cases.
5. Implement: Define expected status/media type and what must not be logged or executed.
6. Implement: Assign each case to M1–M5 tests and identify Bun-owned versus Lugas-owned behavior.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M0-010.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Every P0 threat has a planned test owner and milestone.
- [ ] Secrets and raw hostile payloads are excluded from golden logs.
- [ ] Cases include prototype-like keys, repeated values, Unicode, malformed encoding, and bounded issue output.
- [ ] The matrix links to the security model and conformance oracle.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M0-010.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run verify:docs
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M0-010.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
