---
type: GitHub Issue
title: M4-013 — Create canonical basic, validation, auth, and client examples
status: draft
tags:
- github-issue
- m4
- docs
- docs
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M4-013
  milestone: M4
  milestone_title: M4 — Manifest, Tooling, and Agent DX
  status: backlog
  priority: P0
  size: L
  area: docs
  kind: docs
  global_wave: 32
  milestone_wave: 3
  depends_on:
  - M2-GATE
  - M3-GATE
  - M4-007
  blocks:
  - M4-014
  - M4-016
  - M4-GATE
  - M5-016
  conflict_group: examples
  owner_decision: false
  recommended_branch: agent/M4-013-create-canonical-basic-validation-auth-and-clien
  recommended_worktree: .worktrees/M4-013
  labels:
  - type:docs
  - area:docs
  - priority:p0
  - size:l
---

# M4-013 — Create canonical basic, validation, auth, and client examples

## Outcome

Consolidate examples into one canonical syntax and remove stale milestone workarounds.

## Why this task exists

This task is a bounded unit in **M4 — Manifest, Tooling, and Agent DX**. It unlocks **[M4-014](M4-014-generate-concise-llms-txt-from-canonical-concepts.md), [M4-016](M4-016-finalize-repository-agents-and-evidence-enforcement.md), [M4-GATE](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md), [M5-016](../m5/M5-016-build-the-production-shaped-crud-proof-api.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Ai Friendly Design](../../project/ai-friendly-design.md)
- [Documentation And Okf](../../engineering/documentation-and-okf.md)
- [Github Issue Standard](../../engineering/github-issue-standard.md)

## Dependency contract

- **Depends on:** [M2-GATE](../m2/M2-GATE-verify-validation-guards-security-and-context-contracts.md), [M3-GATE](../m3/M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md), [M4-007](M4-007-integrate-the-typed-client-with-the-test-server-helper.md)
- **Blocks:** [M4-014](M4-014-generate-concise-llms-txt-from-canonical-concepts.md), [M4-016](M4-016-finalize-repository-agents-and-evidence-enforcement.md), [M4-GATE](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md), [M5-016](../m5/M5-016-build-the-production-shaped-crud-proof-api.md)
- **Global wave:** 32
- **Milestone wave:** 3
- **Conflict group:** `examples`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Audit all examples against public exports and accepted ADRs.
- Add end-to-end tests and exact commands/output.
- Keep each example small enough to teach one concept and cross-link the proof API.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
examples/basic/**
examples/validation/**
examples/auth/**
examples/client/**
docs/examples.md
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
git worktree add ".worktrees/M4-013" -b "agent/M4-013-create-canonical-basic-validation-auth-and-clien" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Audit all examples against public exports and accepted ADRs.
5. Implement: Add end-to-end tests and exact commands/output.
6. Implement: Keep each example small enough to teach one concept and cross-link the proof API.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M4-013.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] No two examples teach competing route/guard/client syntax.
- [ ] Every snippet typechecks as source, not copied pseudo-code.
- [ ] Examples use full paths and explicit responses.
- [ ] A clean reader can run each example independently.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M4-013.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run test:examples
bun run verify:docs
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M4-013.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
