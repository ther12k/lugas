---
type: Review Report
title: M6 Final Verification and Evidence Re-Run
status: complete
tags:
- final-evidence
- m6
- release
- performance
- security
---

> **SUPERSEDED (M6R4, 2026-08-28):** this report documents candidate *73337b3 (worktree 4bf91bb)*.
> It is retained for audit history. The **canonical final evidence for the current
> candidate `d2a07b2`** (tarball `lugas-0.1.0-beta.1.tgz`, sha256 `347f11c2…`) is
> [`docs/reports/m6r4-final-evidence.md`](m6r4-final-evidence.md).


# M6 Final Verification and Evidence Re-Run

**Candidate Commit:** `73337b3` (worktree head: `4bf91bb`)  
**Timestamp:** 2026-08-27  
**Runtime:** Bun 1.4.0 (x86_64-linux) · TypeScript 7.0.2

## 1. Executive Summary

This report aggregates all final security, performance, type system, packaging, and compatibility evidence for the LugasJS **v0.1.0-beta.1** release candidate. All benchmarks and checks were re-executed against the exact frozen beta commit candidate with zero waivers and zero P0/P1 defects.

## 2. Performance & Budget Gate (Release Mode)

All measured performance numbers strictly beat the target thresholds defined in `benchmarks/baselines/m5-accepted.json`:

| Scenario / Metric | Release Block Floor | Alert Floor | Target | Measured (Exact Candidate) | Result |
|---|---|---|---|---|---|
| `plain-static` (RPS) | 30,000 | 40,000 | 60,000 | **137,238** | ✅ Target Exceeded (228%) |
| `plain-json` (RPS) | 25,000 | 35,000 | 50,000 | **107,644** | ✅ Target Exceeded (215%) |
| `validated-post` (RPS) | 15,000 | 20,000 | 30,000 | **66,827** | ✅ Target Exceeded (222%) |
| Validated Overhead vs Raw Bun | — | — | < 35% | **11.4%** | ✅ Low Overhead |
| Full Typecheck Duration | — | — | < 2,000ms | **833ms** | ✅ Target Met (41% of budget) |
| Client Bundle Size | — | — | < 25,000 B | **14,900 B** (~4,144 B gzip) | ✅ Target Met (60% of budget) |

Command: `bun run scripts/check-performance-budget.ts --release` -> **PASS: 0 blocking failures, 0 alerts**.

## 3. Security Audit & Invariants

- **Zero Open P0/P1 Findings:** Full security test suites passing (`tests/security/` — 50+ assertions).
- **Error Redaction Invariant:** Production error handler (`withErrorPolicy`) intercepts all thrown errors, stack traces, and unhandled rejections, falling back to safe, redacted Problem Details.
- **Header & Payload Sanitization:** Authorization secrets and cookies are scrubbed from normalized issues; prototype pollution is mitigated via null-prototype context dictionaries.
- **Frozen Route Graphs:** `RouteDescriptor` and `GuardDescriptor` chains are deeply frozen (`Object.freeze`) at `defineApp()` preparation time, preventing post-initialization mutation.

## 4. Supply Chain, Package & Rehearsal Audit

- **Production Dependencies:** Exactly **0** (zero runtime dependencies).
- **Dev Dependencies:** 6 permissively licensed packages (`@standard-schema/spec`, `@types/bun`, `elysia`, `typescript`, `valibot`, `zod`).
- **Tarball File Count:** 69 files (strictly whitelisted; no tests, benchmarks, or worktree artifacts).
- **Package Publication Rehearsal:** `bun run release:package:rehearse` executed 15/15 checks green, validating `npm publish --dry-run --access public --tag beta` against `docs/releases/beta/lugas-0.1.0-beta.1.tgz`.
- **Provenance & SBOM:** Emitted in `docs/releases/beta/` with cryptographic checksums in `SHA256SUMS`.

## 5. Compatibility Matrix

- **Matrix Coverage:** Verified across 6 cells (Ubuntu, macOS, Windows × Bun 1.4.0, Bun 1.4.x) via GitHub Actions workflow (`.github/workflows/compatibility.yml`), including per-cell CLI test suites and environment archival.
- **Statement & Verifier:** Documented in `docs/compatibility.md` and guarded mechanically by `bun run verify:compatibility-report`.

## 6. Clean-Room Agent Proof

- **Clean-Room Scenario:** `tests/clean-room/billing-service.test.ts` (multi-tenant billing service with auth, tenant isolation, Zod validation, test server, and manifest truthfulness) executed 8/8 tests green with zero framework defects.
- **Report:** Documented in `docs/reports/m6-clean-room-agent.md`.

## 7. Final Verification Command & Result

```text
bun run verify
# 620 pass, 0 fail, 1 documented baseline skip
# typecheck: PASS
# docs: PASS (verify-okf)
# diff: PASS
# perf-gate: PASS (release mode)
```
