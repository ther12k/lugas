---
type: GitHub Issue
title: M3-018 — Finalize `lugas/client` exports and packed consumer tests
status: draft
tags:
- github-issue
- m3
- packaging
- integration
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M3-018
  milestone: M3
  milestone_title: M3 — Typed Contract and Client
  status: backlog
  priority: P0
  size: M
  area: packaging
  kind: integration
  global_wave: 28
  milestone_wave: 8
  depends_on:
  - M3-014
  - M3-017
  blocks:
  - M3-GATE
  - M5-009
  conflict_group: shared-package
  owner_decision: false
  recommended_branch: agent/M3-018-finalize-lugas-client-exports-and-packed-consume
  recommended_worktree: .worktrees/M3-018
  labels:
  - type:integration
  - area:packaging
  - priority:p0
  - size:m
---

# M3-018 — Finalize `lugas/client` exports and packed consumer tests

## Outcome

Publish the browser-safe client subpath in the package candidate and verify declaration/runtime resolution.

## Why this task exists

This task is a bounded unit in **M3 — Typed Contract and Client**. It unlocks **[M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md), [M5-009](../m5/M5-009-audit-dependencies-licenses-package-contents-and-sbom.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Packaging And Exports](../../architecture/packaging-and-exports.md)
- [Dependency And Supply Chain](../../engineering/dependency-and-supply-chain.md)

## Dependency contract

- **Depends on:** [M3-014](M3-014-prove-the-client-export-is-browser-safe-and-bun-free.md), [M3-017](M3-017-establish-the-typescript-performance-gate-and-fallback-policy.md)
- **Blocks:** [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md), [M5-009](../m5/M5-009-audit-dependencies-licenses-package-contents-and-sbom.md)
- **Global wave:** 28
- **Milestone wave:** 8
- **Conflict group:** `shared-package`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Add export map and declaration entry for `./client`.
- Test a clean packed consumer importing server type and client runtime.
- Record package and client bundle contents.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/client/index.ts
package.json
tests/package/client-export/**
docs/reports/m3-package.md
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
git worktree add ".worktrees/M3-018" -b "agent/M3-018-finalize-lugas-client-exports-and-packed-consume" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Add export map and declaration entry for `./client`.
5. Implement: Test a clean packed consumer importing server type and client runtime.
6. Implement: Record package and client bundle contents.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M3-018.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] `lugas/client` resolves in Bun/TypeScript and browser bundle fixture.
- [ ] Root server import is not required at client runtime.
- [ ] Internal client modules are not public subpaths.
- [ ] Package dry run contains expected declarations and no raw benchmark/worktree data.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M3-018.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run package:dry-run
bun test tests/package/client-export
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M3-018.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
