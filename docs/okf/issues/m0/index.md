# M0 — Design Freeze and Baselines

Tasks and gates: **12**.

- [M0-001 — Freeze the design baseline and decision registry](M0-001-freeze-the-design-baseline-and-decision-registry.md) — wave 1, depends on none
- [M0-002 — Create the repository skeleton and ownership boundaries](M0-002-create-the-repository-skeleton-and-ownership-boundaries.md) — wave 2, depends on M0-001
- [M0-003 — Pin Bun, TypeScript, and the deterministic toolchain](M0-003-pin-bun-typescript-and-the-deterministic-toolchain.md) — wave 3, depends on M0-002
- [M0-004 — Establish CI skeleton and one verification command](M0-004-establish-ci-skeleton-and-one-verification-command.md) — wave 4, depends on M0-002, M0-003
- [M0-005 — Implement the OKF, link, and issue dependency validator](M0-005-implement-the-okf-link-and-issue-dependency-validator.md) — wave 4, depends on M0-002, M0-003
- [M0-006 — Characterize Bun native route and server semantics](M0-006-characterize-bun-native-route-and-server-semantics.md) — wave 4, depends on M0-003
- [M0-007 — Create raw Bun benchmark fixtures and readiness protocol](M0-007-create-raw-bun-benchmark-fixtures-and-readiness-protocol.md) — wave 4, depends on M0-003
- [M0-008 — Create an idiomatic Elysia 2 comparison fixture](M0-008-create-an-idiomatic-elysia-2-comparison-fixture.md) — wave 4, depends on M0-003
- [M0-009 — Prove the route, services, guards, and client type encoding](M0-009-prove-the-route-services-guards-and-client-type-encoding.md) — wave 4, depends on M0-003
- [M0-010 — Define malformed-request and security fixture plan](M0-010-define-malformed-request-and-security-fixture-plan.md) — wave 5, depends on M0-001, M0-006
- [M0-011 — Install contribution and subagent worktree guards](M0-011-install-contribution-and-subagent-worktree-guards.md) — wave 5, depends on M0-002, M0-004
- [M0-GATE — Verify M0 design, tooling, Bun oracle, and agent readiness](M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md) — wave 6, depends on M0-001, M0-002, M0-003, M0-004, M0-005, M0-006, M0-007, M0-008, M0-009, M0-010, M0-011
