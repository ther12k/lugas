---
type: Engineering Standard
title: GitHub Issue Design Standard for Agent Tasks
status: draft
tags:
- github
- issues
- agents
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# GitHub Issue Design Standard for Agent Tasks

Every implementation issue is a self-contained work contract.

## Required metadata

- stable ID and title;
- milestone;
- priority;
- size (`S`, `M`, or `L`; no unbounded `XL`);
- area and task kind;
- dependency IDs and blocked issues;
- recommended branch/worktree;
- owned files and protected shared files;
- labels;
- parallel wave.

## Required body sections

1. Outcome.
2. Why this task exists.
3. Source documents.
4. Dependency contract.
5. In scope.
6. Non-goals.
7. Expected/owned files.
8. Implementation sequence.
9. Acceptance checklist.
10. Verification commands.
11. Evidence required.
12. Integration and merge notes.
13. Rollback/recovery.
14. Agent stop point.

## Sizing rule

A normal issue should fit one focused worktree and one review cycle. As a guideline:

- no more than one working day of concentrated agent work;
- no more than about eight owned source/test files;
- no more than about 800 net lines unless generated fixtures or a gate report;
- one primary behavior change.

Split issues that cross core/client/CI/docs boundaries unless the work is explicitly an integration task.

## Acceptance criteria

Criteria must be observable. “Implement support” is insufficient. State exact behavior, negative cases, types, diagnostics, and commands.

## Dependencies

Dependencies refer to merged contracts, not merely open PRs. A task may inspect an unmerged branch but is not agent-ready until dependencies are integrated, unless it is explicitly a parallel spike with no code merge dependency.

## Evidence

Every PR creates a dedicated issue evidence report. The report is additive and avoids editing shared roadmap tables, reducing worktree conflicts.
