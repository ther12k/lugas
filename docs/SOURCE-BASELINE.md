---
type: Baseline Record
title: LugasJS Source Baseline
status: active
tags:
- baseline
- provenance
- governance
generated:
  by: implementation-agent
  at: '2026-08-21T00:00:00+07:00'
issue: M0-001
---

# LugasJS Source Baseline

This document binds implementation to one exact design baseline. It is updated only by baseline-freeze issues (M0-001) or accepted corrections.

## Archive identity

- **Source:** OKF v0.2 knowledge bundle generated 2026-08-21 by openai/gpt-5.6-pro (see `docs/okf/index.md`).
- **Import commit:** `e056397` — bundle placed under `docs/okf/` byte-identical on branch `main`.
- **Archive digest:** SHA-256 of the per-file checksum manifest `docs/okf/SHA256SUMS.md`:

  ```text
  0dec80f1891a27e4cc526d72767b9d3e42a854238d6d789ae47714f36244efb0
  ```

  Per-file checksums are in [`docs/okf/SHA256SUMS.md`](okf/SHA256SUMS.md). The bundle reported 247 Markdown files and 116 unique issue IDs at generation time ([validation report](okf/VALIDATION.md)).
- **Provenance rule:** the bundle under `docs/okf/` is never rewritten to match implementation. Corrections are new documents or clearly labeled corrections linked from issue evidence. The only sanctioned append is the reserved [`okf/log.md`](okf/log.md).

## Toolchain baseline at freeze

| Tool | Value | Recorded by |
|---|---|---|
| Bun | 1.4.0 | this baseline; exact pin in `.bun-version` lands with M0-003 |
| TypeScript | not yet pinned | M0-003 records the exact version and lockfile hash |
| Lockfile (`bun.lock`) | not yet present | M0-003 creates it; hash recorded in `docs/toolchain.md` |
| Operating system | Linux 7.0.0-28-generic x64 | this baseline |

## Decision status

- All 16 ADRs in [`docs/okf/decisions/`](okf/decisions/) carry `status: accepted` **as design decisions inside the bundle**. They constrain implementation; they are not implementation evidence.
- Nothing in this repository is implemented, benchmarked, or published at freeze time. Performance figures in the bundle are budgets, not results (ADR-0016).
- Items requiring the owner remain blocked and are tracked in [`docs/open-decisions.md`](open-decisions.md).

## Known design uncertainties at freeze

From the [risk register](okf/delivery/risks-and-open-questions.md); each is closed or bounded by its deciding issue:

| ID | Uncertainty | Deciding issue |
|---|---|---|
| R-001 | Services/guard context type encoding across module files | M0-009 |
| R-002 | End-to-end response unions at 500+ routes (editor/compiler cost) | M3-005, M3-017 |
| R-003 | Thin-wrapper runtime overhead | M5-002, M5-003 |
| R-004/R-005 | Bun route semantics by patch/platform; route-value classification | M0-006, M1-008, M5-010, M6-006 |
| R-006 | Standard Schema library divergence | M2-001, M2-002 |
| R-008 | Manifest mistaken for API schema/OpenAPI | M4-001, M4-003 |
| R-009 | CLI application import side effects | M4-010, M4-012 |
| R-016 | Zero-dependency core vs. Standard Schema typing | M2-001 |
| R-017 | Raw `Response` widening weakening the client contract | M3-003 |
| R-020 | Bun 1.4 / Elysia 2 velocity | exact pins, M5-010, no broad promises |

## Design gates

Each later milestone ends in a gate that must merge before the next milestone starts:

| Milestone | Gate |
|---|---|
| M0 — Design Freeze and Baselines | [M0-GATE](okf/issues/m0/M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md) |
| M1 — Bun-Native Kernel | [M1-GATE](okf/issues/m1/M1-GATE-verify-the-bun-native-kernel-and-response-contract.md) |
| M2 — Validation and Guards | [M2-GATE](okf/issues/m2/M2-GATE-verify-validation-guards-security-and-context-contracts.md) |
| M3 — Typed Contract and Client | [M3-GATE](okf/issues/m3/M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md) |
| M4 — Manifest, Tooling, and Agent DX | [M4-GATE](okf/issues/m4/M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md) |
| M5 — Hardening and Private Alpha | [M5-GATE](okf/issues/m5/M5-GATE-verify-private-alpha-hardening-and-evidence.md) |
| M6 — Beta Stabilization and Release | [M6-GATE](okf/issues/m6/M6-GATE-approve-or-reject-the-v0-1-0-beta-1-release-candidate.md) |
