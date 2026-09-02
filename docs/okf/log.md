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

## 2026-08-24 — M4 gate passed

- M4-001 through M4-017 merged with evidence.
- Runtime manifest truthfulness delivered (`lugas-manifest-v1` format); reading `app.manifest` starts no server and invokes no handlers.
- CLI inspection tooling delivered (`lugas routes`, `lugas inspect`) with subprocess isolation and timeout protection.
- `lugas/testing` subpath exported with `createTestServer` lifecycle management and real typed client integration.

## 2026-08-25 — M4R1 review corrections gate passed

- M4R1-001 through M4R1-008 merged with evidence.
- Canonical `PreparedApp` graph architecture established.
- Exact wildcard matching, error policy wrappers, and server/client response typing invariants closed.

## 2026-08-25 — M5 private alpha hardening passed

- M5-001 through M5-017 merged with evidence.
- Controlled benchmarks established against raw Bun and Elysia comparators.
- 10,000-route stress testing, pipeline stress, cancellation invariants, and private alpha release packet assembled.

## 2026-08-26 — M5R1 review corrections gate passed

- M5R1-001 through M5R1-003 merged with evidence.
- Benchmark comparator alignment, guard chain freezing, and async sentinel fixes resolved.

## 2026-08-27 — M6 beta release gate passed (v0.1.0-beta.1)

- M6-001 through M6-010 and M6-GATE merged with evidence.
- Public API frozen (M6-001); migration guides published (M6-002).
- Publication rehearsal verified (M6-003/M6R1-006, 15/15 checks green).
- Owner decisions approved: naming ODR-0001 (`lugas` on npm), license & governance ODR-0002 (Apache-2.0, `NOTICE`, `SECURITY.md`, `GOVERNANCE.md`).
- Compatibility matrix finalized (M6-006/M6-006-EH: 6/6 CI matrix cells green across Ubuntu/macOS/Windows × Bun 1.4, mechanically verified by `verify:compatibility-report`).
- Defect triage enforced zero P0/P1 defects across M6R1 and M6R2 correction waves.
- Clean-room agent review passed with zero defects (`tests/clean-room/billing-service.test.ts`, 8/8 pass).
- Release-mode performance budget gate passed (plain-static 137k rps, plain-json 107k rps, validated-post 66k rps, typecheck 833ms, client bundle 14.9kB).
- Release packet assembled in `docs/releases/beta/RELEASE_PACKET.md` with cryptographic manifest in `SHA256SUMS`.
- **Verdict: GO.** LugasJS v0.1.0-beta.1 release candidate approved for publication.

## 2026-08-28 — M6R3 post-GATE re-attestation

- Narrow re-attestation after post-GATE evidence-tooling fixes; shipped payload (`src/**` + npm allowlist) unchanged between `ad799b6` (original GO) and candidate `d2a07b2`.
- Release-mode gate hardened: typecheck budget fails closed when unmeasured; smoke archive-suppression flag rejected in release runs.
- Benchmark smoke runs can no longer poison the perf gate (`LUGAS_BENCH_NO_ARCHIVE=1` + byte-exact archive snapshot restore in the validity suite).
- Exact tarball committed and attested: `SHA256SUMS` now includes `lugas-0.1.0-beta.1.tgz` (sha256 `347f11c2…`); `build-beta-packet.ts` fails closed without it.
- All release metadata (packet, checklist, provenance, inventory) regenerated and bound to `d2a07b2`; tag command pins the explicit SHA.
- Standing verdict: **GO — reaffirmed** for `d2a07b2`; publication remains an owner action per `docs/releases/beta/CHECKLIST.md`.

## 2026-08-29 — M6R5/M6R6 post-GATE attestation-chain corrections

- M6R5 (#307): two-identity attestation model (`packageSourceCommit` + `attestationCommit`, `lugas-release-evidence-v2`); rehearsal emits `package-rehearsal.json`; builder cross-validates all artifacts fail-closed; four contaminated benchmark attempts discarded (environment-locked attestation).
- M6R6 (#308): stale M6R3-era artifact set quarantined from the active publication path to `docs/releases/history/m6r3/` (frozen record, checksums still verify in place); `docs/releases/beta/` carries a DO-NOT-PUBLISH README until M6R6-ATT completes.
- M6R6 (#308): attestation procedure corrected to an executable order — benchmarks → rehearsal (clean tree) → `LUGAS_PERF_RELEASE=1 bun run verify` (gate hashes the FINAL tarball) → builder last; the previously documented gate-before-rehearsal order could never succeed.
- M6R6 (#308): builder now fails closed unless evidence `attestationCommit` equals assembly HEAD, executes `LUGAS_PERF_RELEASE=1 bun run verify` itself during assembly, marks only proven claims in the checklist (compat matrix + P0/P1 sweep are explicit owner items), and generates the checksum preflight as a subshell so owner cwd never changes.
- Standing blocker made visible in the ledger: **M6R6-ATT (#309)** — quiet-host final attestation and artifact assembly; the only open issue. Verdict: **source GO, publication HOLD** until #309 completes.

## 2026-08-29 — M6R6.1 release-evidence integrity

- #311: client bundle archive now carries `lugas-client-benchmark-v2` binding (commit/Bun/platform/arch/cpuModel); the runner fails nonzero on any error, and the release gate rejects legacy/unbound/foreign-commit/cross-platform client evidence — stale bundle bytes can no longer be wrapped into current-candidate evidence.
- All three benchmark runners record platform/arch/cpuModel (plain/validated also load average before/after); the gate enforces the platform/arch binding it always claimed and records the archive environment into `release-evidence.json`.
- Owner publication block is fail-closed (`set -euo pipefail` + explicit namespace-claimed assertion); the builder rewrites the DO-NOT-PUBLISH sentinel into an attested-set banner before checksumming the artifact set.
- #309 re-scoped: technical attestation only; publication stays an explicit owner action.

## 2026-09-02 — M6R7 contract-boundary honesty

- #314: `AppContract`/`FlattenPathMethods`/`RouteContract`/`RouteInputContract` (and `Jsonify`) are public exports of the `lugas` root; the README typed-client example now compiles against the installed package, proven by a new installed-tarball consumer test (positive + failing negative control).
- #314: client request slots are typed from the schema's wire input (`StandardSchemaInput`); the server handler context keeps the validated output — transforming schemas now split correctly across the boundary.
- #314: `json()` brands `Jsonify<B>`, so client-visible payload facts reflect `JSON.stringify` truth (Date→string, dropped undefined/function keys, Map/Set→{}, bigint→never, undefined array elements→null). Runtime serialization untouched; body-type restriction was considered and rejected (index-signature false positives on prebuilt bodies).
- #314 (finding 4, discovered by the new boundary test): `AppContract` no longer lets the module-route `Readonly<Record<string, unknown>>` fallback leak a string index signature — module-only apps keep literal path contracts and unknown client paths are compile errors again.
- Consequence: the attested beta artifact set (candidate `0b79f09`) is superseded; **M6R7-ATT** tracks re-attestation before publication is reconsidered (owner action thereafter).
