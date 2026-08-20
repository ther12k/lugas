---
type: Design Session Record
title: LugasJS Design Session Decisions
status: stable
tags:
- reference
- design-session
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Design Session Decisions

## User intent

The project began from a question: with the newer Bun release, can a framework be built directly on Bun that is simpler than Elysia?

The clarified intent is:

- build a new framework, not an Elysia wrapper;
- use Bun-native capabilities wherever possible;
- make application code easier and more explicit than raw Bun;
- keep the framework as small as practical;
- make it unusually friendly to coding agents and worktree-based subagents;
- learn from Elysia and future Elysia 2 design without copying its full model;
- provide Eden-like end-to-end types but own the client contract;
- design the complete project and issue plan in an OKF-style Markdown bundle.

## Decisions captured

- Product name: LugasJS / Lugas.
- Runtime: Bun only.
- Router: Bun native.
- Core: application/module/route/guard/typed response helpers.
- Validation: optional Standard Schema.
- Typed client: explicit fetch-style first.
- Runtime manifest: truthful, separate from compile-time types.
- Delivery: one issue per worktree, dependency DAG, gate issues, additive evidence reports.

## Corrections made during design

1. Bun 1.4 strengthens the case but did not originate every native routing capability; the design relies on current documented Bun behavior, not a release-marketing assumption.
2. “Small” is not automatically faster; Elysia has significant optimization work, so Lugas performance must be measured against raw Bun and feature-equivalent Elysia.
3. Runtime manifests cannot recover erased TypeScript response schemas without explicit metadata or code generation.
4. Package and organization names must remain provisional until current registry/ownership checks.
5. AI-friendly means explicit local contracts and deterministic tasks, not simply fewer characters.
