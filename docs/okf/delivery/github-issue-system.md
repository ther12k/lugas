---
type: Operations Plan
title: GitHub Issue and Worktree Operating System
status: draft
tags:
- github
- workflow
- worktree
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# GitHub Issue and Worktree Operating System

## Source of truth

- Canonical task specification: Markdown file under `issues/`.
- Execution status: GitHub issue/PR/project state.
- Implementation facts: additive evidence file under `docs/reports/issues/`.
- Milestone authority: gate issue/report.
- Architecture authority: accepted ADRs and current owner instructions.

Agents do not edit generated backlog/index/wave documents to mark progress.

## Status flow

```text
Backlog
  → Blocked or Ready
  → Worktree active
  → Pull request
  → Review/correction
  → Merged/Done
  → Milestone gate review
```

## Ready definition

- all dependencies merged;
- predecessor gate merged;
- no overlapping active file ownership;
- owner decision resolved if required;
- acceptance and commands are current;
- base branch CI green.

## Done definition

- behavior and negative tests pass;
- public/type/runtime/security implications reviewed;
- exact verification recorded;
- issue evidence committed;
- no unrelated shared-file edits;
- clean worktree;
- PR merged on dependency-complete base.

## Dispatcher algorithm

1. Query open tasks in the earliest unclosed milestone.
2. Filter to dependency-complete and non-owner-blocked.
3. Group by local wave and conflict group.
4. Inspect owned-file overlap with active worktrees.
5. Dispatch the highest-priority independent set.
6. Reserve integrator tasks for shared files after internal modules land.
7. Run the milestone gate only when all required child tasks are merged.

## Correction policy

A failed task or gate creates a smaller correction issue with:

- dependency on the failed evidence/branch as appropriate;
- explicit files and acceptance;
- `correction` label;
- downstream issues blocked until merge.

Do not silently reopen scope or patch a gate report to hide failure.
