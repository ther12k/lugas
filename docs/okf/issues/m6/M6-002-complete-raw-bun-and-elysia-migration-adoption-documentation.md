---
type: GitHub Issue
title: M6-002 — Complete raw Bun and Elysia migration/adoption documentation
status: draft
tags:
- github-issue
- m6
- docs
- docs
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M6-002
  milestone: M6
  milestone_title: M6 — Beta Stabilization and Release
  status: backlog
  priority: P0
  size: L
  area: docs
  kind: docs
  global_wave: 43
  milestone_wave: 1
  depends_on:
  - M5-GATE
  - M5-015
  - M5-016
  blocks:
  - M6-010
  - M6-GATE
  conflict_group: beta-docs
  owner_decision: false
  recommended_branch: agent/M6-002-complete-raw-bun-and-elysia-migration-adoption-d
  recommended_worktree: .worktrees/M6-002
  labels:
  - type:docs
  - area:docs
  - priority:p0
  - size:l
---

# M6-002 — Complete raw Bun and Elysia migration/adoption documentation

## Outcome

Help teams decide when and how to adopt Lugas without misleading superiority claims.

## Why this task exists

This task is a bounded unit in **M6 — Beta Stabilization and Release**. It unlocks **[M6-010](M6-010-assemble-the-v0-1-0-beta-1-release-packet.md), [M6-GATE](M6-GATE-approve-or-reject-the-v0-1-0-beta-1-release-candidate.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Ai Friendly Design](../../project/ai-friendly-design.md)
- [Documentation And Okf](../../engineering/documentation-and-okf.md)
- [Github Issue Standard](../../engineering/github-issue-standard.md)

## Dependency contract

- **Depends on:** [M5-GATE](../m5/M5-GATE-verify-private-alpha-hardening-and-evidence.md), [M5-015](../m5/M5-015-review-api-consistency-against-principles-and-elysia-lessons.md), [M5-016](../m5/M5-016-build-the-production-shaped-crud-proof-api.md)
- **Blocks:** [M6-010](M6-010-assemble-the-v0-1-0-beta-1-release-packet.md), [M6-GATE](M6-GATE-approve-or-reject-the-v0-1-0-beta-1-release-candidate.md)
- **Global wave:** 43
- **Milestone wave:** 1
- **Conflict group:** `beta-docs`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Write raw Bun-to-Lugas mapping for routes, validation, errors, guards, client, and tests.
- Write Elysia-to-Lugas concept mapping plus explicit missing/non-goal features.
- Include coexistence/escape-hatch examples and decision checklist.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
docs/migrate-from-raw-bun.md
docs/migrate-from-elysia.md
docs/choosing-lugas.md
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
git worktree add ".worktrees/M6-002" -b "agent/M6-002-complete-raw-bun-and-elysia-migration-adoption-d" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Write raw Bun-to-Lugas mapping for routes, validation, errors, guards, client, and tests.
5. Implement: Write Elysia-to-Lugas concept mapping plus explicit missing/non-goal features.
6. Implement: Include coexistence/escape-hatch examples and decision checklist.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M6-002.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Docs do not call unsupported Elysia concepts compatible.
- [ ] Examples compile against beta API.
- [ ] Tradeoffs and cases to stay on raw Bun/Elysia are explicit.
- [ ] No benchmark claim exceeds M5 evidence.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M6-002.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run test:docs-code
bun run verify:docs
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M6-002.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
