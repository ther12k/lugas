---
type: GitHub Issue
title: M4-012 — Test CLI no-server-start, timeout, and process-exit guarantees
status: draft
tags:
- github-issue
- m4
- cli
- security
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M4-012
  milestone: M4
  milestone_title: M4 — Manifest, Tooling, and Agent DX
  status: backlog
  priority: P0
  size: M
  area: cli
  kind: security
  global_wave: 36
  milestone_wave: 7
  depends_on:
  - M4-011
  blocks:
  - M4-GATE
  conflict_group: cli-tests
  owner_decision: false
  recommended_branch: agent/M4-012-test-cli-no-server-start-timeout-and-process-exi
  recommended_worktree: .worktrees/M4-012
  labels:
  - type:security
  - area:cli
  - priority:p0
  - size:m
---

# M4-012 — Test CLI no-server-start, timeout, and process-exit guarantees

## Outcome

Verify inspection cannot silently leave a server or hanging process and fails safely on hostile/broken local modules.

## Why this task exists

This task is a bounded unit in **M4 — Manifest, Tooling, and Agent DX**. It unlocks **[M4-GATE](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Manifest And Inspection](../../architecture/manifest-and-inspection.md)
- [Security And Threat Model](../../engineering/security-and-threat-model.md)

## Dependency contract

- **Depends on:** [M4-011](M4-011-implement-lugas-routes-and-lugas-inspect-json.md)
- **Blocks:** [M4-GATE](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md)
- **Global wave:** 36
- **Milestone wave:** 7
- **Conflict group:** `cli-tests`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Use subprocess fixtures for top-level server start, never-resolving import, thrown module, and noisy output.
- Assert timeouts and cleanup under supported platforms.
- Redact environment and stack detail according to mode.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
tests/cli/fixtures/**
tests/cli/cli-safety.test.ts
docs/cli-security.md
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
git worktree add ".worktrees/M4-012" -b "agent/M4-012-test-cli-no-server-start-timeout-and-process-exi" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Use subprocess fixtures for top-level server start, never-resolving import, thrown module, and noisy output.
5. Implement: Assert timeouts and cleanup under supported platforms.
6. Implement: Redact environment and stack detail according to mode.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M4-012.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] CLI exits zero only after valid deterministic output.
- [ ] Timeout/nonconforming module exits nonzero with stable code.
- [ ] No child server remains reachable after command exit.
- [ ] Security limitations of executing project code are documented.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M4-012.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun test tests/cli/cli-safety.test.ts
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M4-012.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
