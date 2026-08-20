---
type: GitHub Issue
title: M0-011 — Install contribution and subagent worktree guards
status: draft
tags:
- github-issue
- m0
- ci
- docs
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
issue:
  id: M0-011
  milestone: M0
  milestone_title: M0 — Design Freeze and Baselines
  status: backlog
  priority: P0
  size: M
  area: ci
  kind: docs
  global_wave: 5
  milestone_wave: 5
  depends_on:
  - M0-002
  - M0-004
  blocks:
  - M0-GATE
  conflict_group: contributor-policy
  owner_decision: false
  recommended_branch: agent/M0-011-install-contribution-and-subagent-worktree-guard
  recommended_worktree: .worktrees/M0-011
  labels:
  - type:docs
  - area:ci
  - priority:p0
  - size:m
---

# M0-011 — Install contribution and subagent worktree guards

## Outcome

Make one-issue-per-worktree behavior and shared-file ownership enforceable in the repository.

## Why this task exists

This task is a bounded unit in **M0 — Design Freeze and Baselines**. It unlocks **[M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md)** and must not absorb work assigned to those later issues.

## Source documents

- [Ci And Quality Gates](../../engineering/ci-and-quality-gates.md)
- [Subagent Worktree Protocol](../../engineering/subagent-worktree-protocol.md)

## Dependency contract

- **Depends on:** [M0-002](M0-002-create-the-repository-skeleton-and-ownership-boundaries.md), [M0-004](M0-004-establish-ci-skeleton-and-one-verification-command.md)
- **Blocks:** [M0-GATE](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md)
- **Global wave:** 5
- **Milestone wave:** 5
- **Conflict group:** `contributor-policy`
- **Agent-ready when:** every dependency is merged, CI is green on the base commit, no active worktree owns overlapping files, and any owner decision is recorded.

## In scope

- Install AGENTS/contribution guidance and PR/evidence templates.
- Add a check that implementation PRs reference one stable issue ID and evidence file.
- Document dispatcher, task agent, integrator, gate reviewer, and owner roles.

## Non-goals

- Do not implement adjacent later-milestone features.
- Do not change the canonical public API unless this issue explicitly owns that decision.
- Do not edit shared package/export/CI/central-status files that are not listed under Owned files.
- Do not publish packages, create public assets, or weaken tests/benchmarks to claim completion.

## Owned files

```text
AGENTS.md
CONTRIBUTING.md
.github/pull_request_template.md
scripts/verify-issue-evidence.ts
docs/agent-workflow.md
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
git worktree add ".worktrees/M0-011" -b "agent/M0-011-install-contribution-and-subagent-worktree-guard" <dependency-complete-base>
```

## Implementation sequence

1. Create the recommended worktree from the latest dependency-complete base and record the base commit.
2. Read this issue, every source document, and the evidence reports from all dependencies.
3. Inspect existing code and tests; write or activate a failing fixture for each behavioral acceptance criterion.
4. Implement: Install AGENTS/contribution guidance and PR/evidence templates.
5. Implement: Add a check that implementation PRs reference one stable issue ID and evidence file.
6. Implement: Document dispatcher, task agent, integrator, gate reviewer, and owner roles.
7. Add negative, type, security, cleanup, or conformance cases appropriate to the area.
8. Run every verification command exactly; report unavailable checks as unexecuted rather than passed.
9. Create `docs/reports/issues/M0-011.md` from the evidence template and leave the worktree clean.

## Acceptance checklist

- [ ] A sample PR missing evidence fails the policy check or is clearly blocked by template review.
- [ ] Shared files and conflict rules are explicit.
- [ ] Agents are prohibited from editing central progress tables.
- [ ] Worktree creation, cleanup, and failure recovery commands are documented.
- [ ] Exact commands and results are recorded in `docs/reports/issues/M0-011.md`.
- [ ] The diff contains no unrelated cleanup, generated debris, or unapproved public API expansion.
- [ ] `git status --short` is clean at handoff.

## Verification commands

```bash
bun run verify:evidence
bun run verify:docs
```

Commands may be introduced by dependencies. If a command name changes through an accepted integrator issue, use the canonical replacement and record the mapping.

## Evidence required

Create `docs/reports/issues/M0-011.md` using the [issue evidence template](../../templates/issue-evidence-template.md). Include baseline commit, files changed, acceptance mapping, exact commands/results, type/runtime/bundle impact, security considerations, limitations, final commit, and clean worktree state.

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
