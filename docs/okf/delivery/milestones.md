---
type: Delivery Plan
title: Milestone Outcomes and Exit Criteria
status: draft
tags:
- milestones
- exit-criteria
- gates
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Milestone Outcomes and Exit Criteria

| Milestone | Required outcome | Primary gate |
|---|---|---|
| M0 | Reproducible design/tooling baseline, Bun oracle, type decision, CI, issue/worktree system | `M0-GATE` |
| M1 | Small native kernel with typed responses, no custom router, public package proof | `M1-GATE` |
| M2 | Optional validation and ordered typed guards with closed security semantics | `M2-GATE` |
| M3 | Browser-safe explicit typed client with accepted TypeScript cost | `M3-GATE` |
| M4 | Truthful manifest, diagnostics, testing, safe inspection, examples, agent docs | `M4-GATE` |
| M5 | Security/compatibility/performance/type/package hardening and private alpha packet | `M5-GATE` |
| M6 | Frozen beta candidate, owner decisions, clean-room validation, final packet | `M6-GATE` |

## Universal gate criteria

Every milestone gate verifies:

- all required task PRs merged;
- evidence files on exact commits;
- clean checkout reproduction;
- no hidden skipped or unexecuted checks represented as pass;
- zero open P0/P1 defects in milestone scope;
- public API/ADR/doc alignment;
- valid issue dependency graph for the next milestone;
- clean repository and reproducible package/docs state.

## Gate independence

The gate reviewer should not be the sole author of every child task. When independent review resources are limited, rerun all commands in a fresh worktree and explicitly disclose the review limitation.
