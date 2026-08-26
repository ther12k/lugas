# LugasJS

**Lugas** is a small, explicit, Bun-native TypeScript framework for humans and coding agents: raw `Bun.serve` with the missing structure — typed routes, optional validation, typed guards, predictable errors, an explicit end-to-end client, testing helpers, and deterministic inspection.

> **Status:** pre-release implementation candidate. The framework core, typed client, testing helpers, CLI inspection, and benchmark suites are implemented and gated by `bun run verify` (see `docs/reports/` for per-issue evidence). Nothing is published to any registry; the v0.1.0-beta candidate exists as a locally packed tarball pending owner release decisions (M6).

## Repository map

- [`docs/okf/`](docs/okf/index.md) — the frozen OKF v0.2 knowledge bundle: charter, architecture, engineering standards, delivery plan, ADRs, and the full GitHub-ready issue backlog (M0–M6).
- [`AGENTS.md`](AGENTS.md) — standing operating rules for human and AI contributors.
- [`docs/reports/`](docs/reports/) — implementation evidence: one report per issue, gate reviews.

## How this repository is built

Work is organized into milestones M0–M6, each made of small, dependency-aware issues executed in one worktree per issue with evidence reports and gate reviews between milestones:

1. Start with the [master agent prompt](docs/okf/MASTER_AGENT_PROMPT.md) and the [issue backlog](docs/okf/issues/index.md).
2. One issue, one worktree, one atomic PR, one evidence report under `docs/reports/issues/`.
3. A milestone is complete only when its gate issue has checked every acceptance criterion against merged evidence.

Runtime targets Bun 1.4.x only, with zero production runtime dependencies in the core.
