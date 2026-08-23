# LugasJS OKF Update Log

## 2026-08-21 — Initial design and executable issue package

- Adopted the product name **LugasJS** and short name **Lugas**; package namespace remains an owner decision until registry reservation.
- Defined a Bun-only framework that composes directly into native `Bun.serve({ routes })` rather than implementing a router.
- Chose an explicit fetch-style typed client instead of depending on Eden Treaty or starting with a Proxy-based tree client.
- Separated compile-time response contracts from runtime manifests so erased TypeScript information is never presented as runtime truth.
- Added architecture, engineering, security, testing, performance, release, and governance documents.
- Added a dependency-checked GitHub issue backlog designed for one issue per subagent worktree.
- Generated a local bundle report and structural validation. Local validation is not certification by Google or another third party.

## 2026-08-21 — Implementation baseline frozen (M0-001)

- Bundle imported byte-identical under `docs/okf/` at commit `e056397`; archive digest recorded in `docs/SOURCE-BASELINE.md`.
- Open owner decisions registered in `docs/open-decisions.md`; package identity, license, publication, performance messaging, and post-beta scope remain owner-blocked.
- Known design uncertainties mapped to their deciding issues (M0-006, M0-009, M2-001, M3-017, M4-010, M5-002/M5-003).

## 2026-08-21 — M0 gate passed

- M0-001 through M0-011 merged with evidence; clean checkout verification passed (`bun run verify`: typecheck, 29 tests, OKF validator, diff hygiene).
- M0-009 recommends stateless bound type definitions with explicit generic escape hatch for M1.
- M1 implementation is authorized; owner-blocked package/license/publication decisions remain unchanged.


## 2026-08-21 — M1 gate passed locally

- M1-001 through M1-018 merged with evidence; local clean verification: 111 tests pass, 1 documented Bun leak characterization skip, 0 failures, typecheck/docs/diff pass.
- M1 conformance exposed and corrected nested descriptor compilation in native method maps (c206180).
- M2 implementation is authorized after gate merge; GitHub Actions remains blocked by account billing/spending-limit condition.

## 2026-08-21 — M2 gate passed locally

- M2-001 through M2-018 merged with evidence; local clean verification: 218 tests pass, 1 documented Bun leak characterization skip, 0 failures, typecheck/docs/diff pass.
- Input validation across params, query, headers, and body implemented with Standard Schema v1 structural support and 0 runtime dependencies.
- Sequential guard execution, typed context enrichment, short-circuit response unions, adversarial security matrix, and bounded fuzz tests closed.
- M3 typed client implementation is authorized after gate merge.


## 2026-08-23 — M3 gate passed locally

- M3-001 through M3-018 merged with evidence; clean-checkout reproduction: 367 tests pass, 1 documented skip, 0 failures, typecheck/docs/diff pass.
- Typed client delivered end-to-end: contract-derived path/input lookup types, explicit methods with compile-time path restrictions, frozen URL/query/header/body semantics, discriminated results keyed by actual status, transport failures preserved as plain fetch rejections.
- Browser safety proven at source-graph, bundle-token, and foreign-engine (Node) execution levels; `lugas/client` subpath exported and packed-consumer verified.
- Type-cost gate ACCEPTED: 500-route cold check 166–339 ms / 111 MB with deterministic instantiation counts (177,486); 1,000-route stress reported practical. Generated-client fallback not adopted.
- Stable diagnostics catalog LUGAS_CLIENT_001–010 documented in `docs/client-error-semantics.md`.
- M4 implementation is authorized after gate merge; GitHub Actions remains blocked by account billing/spending-limit condition.
