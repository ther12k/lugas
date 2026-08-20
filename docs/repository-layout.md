---
type: Repository Documentation
title: LugasJS Repository Layout and Ownership Zones
status: active
tags:
- repository
- layout
- ownership
- worktree
issue: M0-002
---

# Repository Layout and Ownership Zones

The canonical shape lives in [`docs/okf/engineering/repository-layout.md`](okf/engineering/repository-layout.md) and the master agent prompt; this file records what exists **now**, what each zone is for, and who may touch what.

## Current tree

```text
src/
  core/       public Bun-native application kernel (M1+; empty until M1-001)
  internal/   unstable composition, validation, diagnostics (M1+; never importable by examples)
  client/     browser-safe typed fetch client (M3+)
  testing/    Bun-only test server helpers (M4+)
examples/
  basic/      minimal proof application (M1-017)
tests/
  unit/ integration/ conformance/ types/ fixtures/
benchmarks/
  raw-bun/    controlled raw Bun baseline fixtures (M0-007)
  elysia/     idiomatic Elysia 2 comparison fixture (M0-008)
scripts/      verification and tooling entry points (M0-004, M0-005, M0-007)
docs/
  okf/        frozen OKF v0.2 knowledge bundle (see docs/SOURCE-BASELINE.md)
  reports/    implementation evidence: issues/, gates/, github-issue-map.md
.worktrees/   one git worktree per active issue (git-ignored; never committed)
```

Directories are created only when an issue needs them (`cli/`, `examples/{validation,auth,client,proof-api}/`, `benchmarks/typecheck/`, `spikes/` arrive with their owning issues). A `.gitkeep` marks an intentionally empty zone; it is removed when the first real file lands.

## Layout rules

1. **Examples never import `src/internal/**`.** Examples consume only the future public entry points (`src/index.ts`, `src/client/index.ts`, `src/testing/index.ts` — package exports after M1-018). There is no runtime-enforced boundary in M0; the rule is enforced by review and by M3-014/M4-017 package-graph checks.
2. **No placeholder runtime modules.** Empty zones hold `.gitkeep` only. TypeScript files under `src/` appear first in M1-001 with real contracts.
3. **Worktrees live in `.worktrees/<ISSUE-ID>`** at the repository root and are git-ignored, so one worktree per issue cannot pollute checkouts or nested worktree creation. Worktrees are removed on merge.

## Shared-file hotspots (integrator-only)

From [`AGENTS.md`](../AGENTS.md); changed only by issues that explicitly own them:

```text
package.json
bun.lock
src/index.ts / src/client/index.ts / src/testing/index.ts
tsconfig*.json
.github/workflows/*
docs/okf/delivery/backlog.md
docs/okf/delivery/issue-index.md
```

## Evidence zone

- `docs/reports/issues/<ISSUE-ID>.md` — one evidence report per implementation task.
- `docs/reports/gates/<MILESTONE>.md` — gate review packets.
- `docs/reports/github-issue-map.md` — stable ID to GitHub issue number mapping.
