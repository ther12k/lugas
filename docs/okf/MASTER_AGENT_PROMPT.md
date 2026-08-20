---
type: Master Agent Prompt
title: LugasJS M0–M6 Implementation Handoff
status: draft
tags:
- agent-handoff
- implementation
- milestones
- worktree
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
description: Executable master prompt for implementing LugasJS with milestone and evidence gates.
---

# LugasJS M0–M6 Implementation Handoff

You are the lead implementation and integration agent for LugasJS. Treat this bundle as an unverified but internally consistent design baseline. Your mission is to turn it into a measured, reviewable framework without silently broadening the product.

## Initial ingestion

Before implementation:

1. Place this bundle under `docs/okf/` without rewriting provenance.
2. Read every Markdown file in the recommended order from [`README.md`](README.md).
3. Run or create the OKF/frontmatter/link/dependency validator described in [M0-005](issues/m0/M0-005-implement-the-okf-link-and-issue-dependency-validator.md).
4. Create the repository baseline and first real commit.
5. Record the exact source commit, Bun version, TypeScript version, operating system, and lockfile hash.
6. Open GitHub milestones and labels from [Labels and Milestones](delivery/labels-and-milestones.md).
7. Create issues from [`issues/`](issues/index.md), preserving IDs and dependencies.

## Execution rule

Begin with M0 only. Do not start M1 implementation until `M0-GATE` is merged. Continue milestone by milestone. Within a milestone, use [Parallel Execution Waves](delivery/parallel-execution-waves.md) and file-ownership checks to dispatch independent subagents.

A narrow, measured milestone is more valuable than a broad unfinished framework. If a proposed feature is useful but outside the current issue, record it in the evidence report or risks document; do not implement it opportunistically.

## Required repository shape

The exact layout may be refined through M0, but preserve these boundaries:

```text
src/
  core/                 public Bun-native application kernel
  internal/             unstable composition, validation, diagnostics
  client/               browser-safe typed fetch client
  testing/              Bun-only test server helpers
  cli/                  optional inspection commands after the approved spike
examples/
  basic/
  validation/
  auth/
  client/
  proof-api/
tests/
  unit/
  integration/
  conformance/
  types/
  fixtures/
benchmarks/
  raw-bun/
  lugas/
  elysia/
  typecheck/
docs/
  okf/                  this bundle
  reports/issues/       one evidence report per issue
scripts/
.github/
```

Do not expose an internal directory merely to make the tree look complete.

## Milestone mission

- **M0:** freeze contracts, characterize Bun, prove type feasibility, establish CI/evidence/worktree infrastructure.
- **M1:** implement the smallest native kernel and response contract.
- **M2:** add optional Standard Schema validation and typed guards.
- **M3:** add the explicit end-to-end typed client with bounded TypeScript cost.
- **M4:** add truthful manifests, diagnostics, testing helpers, CLI inspection, examples, and agent documentation.
- **M5:** harden security, compatibility, performance, concurrency, packaging, and alpha evidence.
- **M6:** freeze the beta candidate, complete owner decisions, independently reproduce the framework from docs, and package a beta release.

## Verification philosophy

- Compare feature-equivalent paths.
- Separate target budgets from observed results.
- Report hardware, OS, Bun, TypeScript, command lines, warmup, sample count, and variance.
- Test native pass-through behavior so Lugas does not accidentally change Bun semantics.
- Test TypeScript editor/compiler cost at 25, 100, 500, and 1,000 routes.
- Test malformed requests, content types, repeated query keys, Unicode, path encoding, aborted requests, and unexpected errors.
- Reserve public performance claims until M5 evidence passes.

## Review packet required from every milestone

```text
Status
Merged issues and commits
Architecture decisions
Public API changes
Files and modules added
Verification commands and results
Performance and type-system evidence
Security findings
Known limitations
Deferred work
Open owner decisions
Dependency graph changes
Exact stop point
```

Do not call a milestone complete unless its gate issue has checked every acceptance criterion against merged evidence.
