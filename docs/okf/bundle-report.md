---
type: Bundle Report
title: LugasJS OKF Bundle Report
status: stable
tags:
- bundle
- report
- inventory
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS OKF Bundle Report

## Executive summary

This archive is the complete **design and executable delivery package** for LugasJS. It defines the product, architecture, engineering standards, ADRs, current-source references, GitHub operating model, and a dependency-checked backlog suitable for one issue per subagent worktree.

It does **not** contain framework source code and does not claim that any milestone gate has passed.

## Package metrics

| Metric | Value |
|---|---:|
| Markdown files | 247 |
| GitHub tasks and gates | 116 |
| Gate issues | 7 |
| Dependency edges | 369 |
| Global execution waves | 46 |
| Internal links checked | 2750 |
| Non-control content SHA-256 | `b30b2028b7d6b5afba826800c4a185aaf8803dbef36e790502c5febad8e04ba2` |

## Issues by milestone

| Milestone | Tasks and gates |
|---|---:|
| M0 | 12 |
| M1 | 19 |
| M2 | 19 |
| M3 | 19 |
| M4 | 18 |
| M5 | 18 |
| M6 | 11 |

## Issues by kind

| Kind | Count |
|---|---:|
| `benchmark` | 11 |
| `docs` | 10 |
| `gate` | 7 |
| `implementation` | 52 |
| `integration` | 11 |
| `release` | 6 |
| `security` | 4 |
| `spike` | 3 |
| `test` | 12 |

## Issues by area

| Area | Count |
|---|---:|
| `architecture` | 4 |
| `ci` | 4 |
| `cli` | 3 |
| `client` | 8 |
| `core` | 6 |
| `docs` | 9 |
| `guards` | 4 |
| `manifest` | 5 |
| `packaging` | 6 |
| `performance` | 11 |
| `release` | 13 |
| `responses` | 3 |
| `routing` | 6 |
| `security` | 7 |
| `testing` | 9 |
| `types` | 9 |
| `validation` | 9 |

## Global dependency waves

| Wave | Ready nodes before conflict/ownership filtering |
|---:|---:|
| 1 | 1 |
| 2 | 1 |
| 3 | 1 |
| 4 | 6 |
| 5 | 2 |
| 6 | 1 |
| 7 | 1 |
| 8 | 3 |
| 9 | 2 |
| 10 | 1 |
| 11 | 5 |
| 12 | 3 |
| 13 | 3 |
| 14 | 1 |
| 15 | 4 |
| 16 | 8 |
| 17 | 2 |
| 18 | 1 |
| 19 | 3 |
| 20 | 1 |
| 21 | 1 |
| 22 | 3 |
| 23 | 2 |
| 24 | 1 |
| 25 | 5 |
| 26 | 2 |
| 27 | 2 |
| 28 | 2 |
| 29 | 1 |
| 30 | 3 |
| 31 | 3 |
| 32 | 2 |
| 33 | 3 |
| 34 | 3 |
| 35 | 1 |
| 36 | 2 |
| 37 | 1 |
| 38 | 9 |
| 39 | 5 |
| 40 | 2 |
| 41 | 1 |
| 42 | 1 |
| 43 | 8 |
| 44 | 1 |
| 45 | 1 |
| 46 | 1 |

## Documents by top-level directory

| Directory | Markdown files |
|---|---:|
| `architecture` | 19 |
| `decisions` | 17 |
| `delivery` | 17 |
| `engineering` | 17 |
| `github` | 6 |
| `issues` | 124 |
| `project` | 12 |
| `references` | 10 |
| `reports` | 6 |
| `root` | 9 |
| `templates` | 10 |

## Key architectural outcome

- Bun is the only runtime target and remains authoritative for HTTP routing/serving.
- Lugas adds a small explicit declaration and composition layer rather than another router.
- Optional Standard Schema validation and ordered typed guards form one bounded request pipeline.
- Typed native response helpers support an explicit browser-safe client without Eden/Elysia coupling.
- Compile-time contract inference is deliberately separated from runtime manifest truth.
- Optional capabilities remain outside core unless evidence and ADRs justify admission.

## Subagent execution outcome

Every issue carries stable ID, milestone, priority, size, area, kind, dependency and block lists, global/local wave, conflict group, source docs, owned/protected files, recommended branch/worktree, implementation sequence, acceptance, verification, evidence contract, integration notes, rollback, and stop point.

The dispatcher still must filter graph-ready tasks for overlapping file ownership and owner decisions. A shared wave is permission to consider parallel execution, not permission to create conflicting worktrees.

## Trust and limitations

- All implementation claims remain unverified because implementation is not part of this archive.
- Performance numbers are budgets or comparison plans, not benchmark results.
- Package/repository/domain availability, license, governance, and public release require explicit owner decisions.
- Current external behavior must be rechecked against the pinned Bun/Elysia/standards versions during M0.
- Local OKF validation is stricter than the minimal profile used here, but it is not external certification.
