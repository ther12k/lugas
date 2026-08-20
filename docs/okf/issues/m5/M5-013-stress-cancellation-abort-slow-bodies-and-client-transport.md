---
type: GitHub Issue
title: M5-013 — Stress cancellation, abort, slow bodies, and client transport
status: draft
tags:
- github-issue
- m5
- security
- test
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M5-013
  milestone: M5
  milestone_title: M5 — Hardening and Private Alpha
  status: backlog
  priority: P0
  size: L
  area: security
  kind: test
  global_wave: 38
  milestone_wave: 1
  depends_on:
  - M4-GATE
  - M2-GATE
  - M3-013
  blocks:
  - M5-017
  - M5-GATE
  conflict_group: stress-tests
  owner_decision: false
  recommended_branch: agent/M5-013-stress-cancellation-abort-slow-bodies-and-client
  recommended_worktree: .worktrees/M5-013
  labels:
  - type:test
  - area:security
  - priority:p0
  - size:l
---

# M5-013 — Stress cancellation, abort, slow bodies, and client transport

## Outcome

Verify request/client cancellation and slow-input behavior without fabricated HTTP results or leaked work.

## Why this task exists

This task is a bounded unit in **M5 — Hardening and Private Alpha**. It unlocks **[M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Security And Threat Model](../../engineering/security-and-threat-model.md)
- [Dependency And Supply Chain](../../engineering/dependency-and-supply-chain.md)

## Dependency contract

- **Depends on:** [M4-GATE](../m4/M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md), [M2-GATE](../m2/M2-GATE-verify-validation-guards-security-and-context-contracts.md), [M3-013](../m3/M3-013-preserve-network-abort-and-raw-fetch-failure-behavior.md)
- **Blocks:** [M5-017](M5-017-assemble-the-private-alpha-review-and-release-packet.md), [M5-GATE](M5-GATE-verify-private-alpha-hardening-and-evidence.md)
- **Global wave:** 38
- **Milestone wave:** 1
- **Conflict group:** `stress-tests`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Abort before send, during body read, during async validation/guard, and during handler.
- Exercise slow/partial JSON bodies within controlled limits.
- Record what Bun cancels versus what application code must observe.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
tests/stress/cancellation.test.ts
tests/security/slow-body.test.ts
docs/reports/m5-cancellation.md
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
git worktree add ".worktrees/M5-013" -b "agent/M5-013-stress-cancellation-abort-slow-bodies-and-client" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Abort before send, during body read, during async validation/guard, and during handler.
5. Implement: Exercise slow/partial JSON bodies within controlled limits.
6. Implement: Record what Bun cancels versus what application code must observe.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M5-013.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Client abort rejects as transport failure.
- [ ] No 4xx/5xx result is fabricated for transport abort.
- [ ] Framework stops its own downstream stages after abort where observable.
- [ ] No raw partial body or stack is leaked.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M5-013.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/stress/cancellation.test.ts
bun test tests/security/slow-body.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M5-013.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
