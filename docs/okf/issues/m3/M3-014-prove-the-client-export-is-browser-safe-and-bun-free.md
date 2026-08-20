---
type: GitHub Issue
title: M3-014 — Prove the client export is browser-safe and Bun-free
status: draft
tags:
- github-issue
- m3
- packaging
- test
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M3-014
  milestone: M3
  milestone_title: M3 — Typed Contract and Client
  status: backlog
  priority: P0
  size: M
  area: packaging
  kind: test
  global_wave: 27
  milestone_wave: 7
  depends_on:
  - M3-006
  - M3-007
  - M3-008
  - M3-009
  - M3-010
  - M3-011
  - M3-012
  - M3-013
  blocks:
  - M3-018
  - M3-GATE
  conflict_group: client-package
  owner_decision: false
  recommended_branch: agent/M3-014-prove-the-client-export-is-browser-safe-and-bun-
  recommended_worktree: .worktrees/M3-014
  labels:
  - type:test
  - area:packaging
  - priority:p0
  - size:m
---

# M3-014 — Prove the client export is browser-safe and Bun-free

## Outcome

Guarantee that `lugas/client` can bundle and execute without Bun runtime globals or server modules.

## Why this task exists

This task is a bounded unit in **M3 — Typed Contract and Client**. It unlocks **[M3-018](M3-018-finalize-lugas-client-exports-and-packed-consumer-tests.md), [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Packaging And Exports](../../architecture/packaging-and-exports.md)
- [Dependency And Supply Chain](../../engineering/dependency-and-supply-chain.md)

## Dependency contract

- **Depends on:** [M3-006](M3-006-implement-createclient-base-configuration-and-fetch-injection.md), [M3-007](M3-007-add-typed-explicit-http-methods-and-path-restrictions.md), [M3-008](M3-008-implement-path-parameter-interpolation-and-encoding.md), [M3-009](M3-009-implement-query-serialization-matching-server-decoding.md), [M3-010](M3-010-implement-headers-json-body-and-requestinit-merging.md), [M3-011](M3-011-parse-http-responses-into-discriminated-client-results.md), [M3-012](M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md), [M3-013](M3-013-preserve-network-abort-and-raw-fetch-failure-behavior.md)
- **Blocks:** [M3-018](M3-018-finalize-lugas-client-exports-and-packed-consumer-tests.md), [M3-GATE](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md)
- **Global wave:** 27
- **Milestone wave:** 7
- **Conflict group:** `client-package`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Bundle a browser fixture and inspect dependency/metafile graph.
- Run a Bun-disabled/global-Bun-absent import smoke.
- Ensure server types are imported type-only.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
tests/package/client-browser/**
scripts/check-client-graph.ts
docs/reports/m3-client-bundle.md
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
git worktree add ".worktrees/M3-014" -b "agent/M3-014-prove-the-client-export-is-browser-safe-and-bun-" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Bundle a browser fixture and inspect dependency/metafile graph.
5. Implement: Run a Bun-disabled/global-Bun-absent import smoke.
6. Implement: Ensure server types are imported type-only.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M3-014.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] No runtime import from `bun`, `src/core/app`, server/testing, or CLI appears in client bundle.
- [ ] Bundle executes with a standards-compatible fetch stub.
- [ ] Client package size is measured but not marketed.
- [ ] Tree shaking excludes unused method helpers where the build supports it.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M3-014.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run test:browser-import
bun run bundle:client:inspect
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M3-014.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
