---
type: GitHub Issue
title: M4-017 — Finalize `lugas/testing` and CLI package exports
status: draft
tags:
- github-issue
- m4
- packaging
- integration
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M4-017
  milestone: M4
  milestone_title: M4 — Manifest, Tooling, and Agent DX
  status: backlog
  priority: P0
  size: M
  area: packaging
  kind: integration
  global_wave: 36
  milestone_wave: 7
  depends_on:
  - M4-007
  - M4-008
  - M4-011
  blocks:
  - M4-GATE
  - M5-009
  conflict_group: shared-package
  owner_decision: false
  recommended_branch: agent/M4-017-finalize-lugas-testing-and-cli-package-exports
  recommended_worktree: .worktrees/M4-017
  labels:
  - type:integration
  - area:packaging
  - priority:p0
  - size:m
---

# M4-017 — Finalize `lugas/testing` and CLI package exports

## Outcome

Expose testing and CLI artifacts without contaminating production core or browser client bundles.

## Why this task exists

This task is a bounded unit in **M4 — Manifest, Tooling, and Agent DX**. It unlocks **[M4-GATE](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md), [M5-009](../m5/M5-009-audit-dependencies-licenses-package-contents-and-sbom.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Packaging And Exports](../../architecture/packaging-and-exports.md)
- [Dependency And Supply Chain](../../engineering/dependency-and-supply-chain.md)

## Dependency contract

- **Depends on:** [M4-007](M4-007-integrate-the-typed-client-with-the-test-server-helper.md), [M4-008](M4-008-close-test-server-cleanup-failure-and-leak-behavior.md), [M4-011](M4-011-implement-lugas-routes-and-lugas-inspect-json.md)
- **Blocks:** [M4-GATE](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md), [M5-009](../m5/M5-009-audit-dependencies-licenses-package-contents-and-sbom.md)
- **Global wave:** 36
- **Milestone wave:** 7
- **Conflict group:** `shared-package`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Add `./testing` export and CLI binary mapping.
- Run packed consumer and command tests.
- Inspect package files and dependency graph by subpath.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
src/testing/index.ts
package.json
tests/package/testing-cli-export/**
docs/reports/m4-package.md
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
git worktree add ".worktrees/M4-017" -b "agent/M4-017-finalize-lugas-testing-and-cli-package-exports" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Add `./testing` export and CLI binary mapping.
5. Implement: Run packed consumer and command tests.
6. Implement: Inspect package files and dependency graph by subpath.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M4-017.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] `lugas/testing` resolves only in Bun-compatible consumer.
- [ ] Client bundle remains Bun-free.
- [ ] CLI runs from packed tarball and exits deterministically.
- [ ] No internal source path becomes an accidental export.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M4-017.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run package:dry-run
bun test tests/package/testing-cli-export
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M4-017.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
