---
type: GitHub Issue
title: M4-002 — Capture module, path, method, and route-kind metadata
status: draft
tags:
- github-issue
- m4
- manifest
- implementation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M4-002
  milestone: M4
  milestone_title: M4 — Manifest, Tooling, and Agent DX
  status: backlog
  priority: P0
  size: M
  area: manifest
  kind: implementation
  global_wave: 31
  milestone_wave: 2
  depends_on:
  - M4-001
  - M1-007
  blocks:
  - M4-003
  - M4-GATE
  conflict_group: manifest-runtime
  owner_decision: false
  recommended_branch: agent/M4-002-capture-module-path-method-and-route-kind-metada
  recommended_worktree: .worktrees/M4-002
  labels:
  - type:implementation
  - area:manifest
  - priority:p0
  - size:m
---

# M4-002 — Capture module, path, method, and route-kind metadata

## Outcome

Build deterministic runtime records for composed root/module routes and native versus descriptor classification.

## Why this task exists

This task is a bounded unit in **M4 — Manifest, Tooling, and Agent DX**. It unlocks **[M4-003](M4-003-capture-validation-capabilities-and-ordered-guard-names-truthfully.md), [M4-GATE](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Manifest And Inspection](../../architecture/manifest-and-inspection.md)
- [0014 Contract Manifest Separation](../../decisions/0014-contract-manifest-separation.md)

## Dependency contract

- **Depends on:** [M4-001](M4-001-freeze-the-runtime-manifest-v1-schema-and-stability-policy.md), [M1-007](../m1/M1-007-implement-the-defineapp-validation-and-composition-shell.md)
- **Blocks:** [M4-003](M4-003-capture-validation-capabilities-and-ordered-guard-names-truthfully.md), [M4-GATE](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md)
- **Global wave:** 31
- **Milestone wave:** 2
- **Conflict group:** `manifest-runtime`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Capture metadata during app composition, not by inspecting final handlers.
- Sort serialized routes by the accepted policy.
- Avoid retaining handler/service references in public manifest objects.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/internal/manifest.ts
tests/unit/manifest-routes.test.ts
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
git worktree add ".worktrees/M4-002" -b "agent/M4-002-capture-module-path-method-and-route-kind-metada" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Capture metadata during app composition, not by inspecting final handlers.
5. Implement: Sort serialized routes by the accepted policy.
6. Implement: Avoid retaining handler/service references in public manifest objects.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M4-002.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] Manifest includes every final method/path exactly once.
- [ ] Module attribution is correct and root routes use null/root identity.
- [ ] Native static/handler/directory and Lugas descriptors are classified truthfully at the agreed granularity.
- [ ] Manifest is readonly and serializable.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M4-002.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/unit/manifest-routes.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M4-002.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
