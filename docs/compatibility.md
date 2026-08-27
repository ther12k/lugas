---
type: Compatibility Statement
title: Lugas v0.1.0-beta.1 Supported Combinations
status: current
tags:
- compatibility
- release
- bun
---

# Compatibility

This table is generated from CI results (`compatibility.yml`) run against the
beta candidate commit. Unsupported combinations are explicit; support is not
implied by broad semver ranges.

## Runtime (server core + CLI + testing helpers)

The CLI is verified per-platform in the same matrix (`tests/cli/` covers process spawning, signals, and timeouts — the areas where OSes differ).

Resolved patch values below are lock/CI-resolved; the "1.4.x latest patch" selector resolves at matrix run time and the exact version is archived per cell in CI ([matrix evidence](reports/m6-compatibility.md)).

| Server core / CLI | Declared selector | Exact tested | Linux x86-64 | macOS arm64 | Windows x64 |
|---|---|---|---|---|---|
| Server core | **1.4.0** | 1.4.0 | ✅ | ✅ | ✅ |
| Server core | **1.4.x** latest patch near release | recorded in CI summary per run | ✅ | ✅ | ✅ |

Bun outside **1.4.x (patch releases)** is unsupported: through its own 1.x line, Lugas pins to Bun 1.4 only (native `Bun.serve({ routes })` method-map semantics, spawn timeout properties, filesystem semantics). Other Bun majors are neither tested nor claimed.

## Type checking

| Toolchain | Version | Status |
|---|---|---|
| TypeScript | **7.0.2** (pinned devDependency) | ✅ verified (typecheck + `.test-d.ts` type suites, linux-x64) |

Other TypeScript versions are untested; strict-mode flags in use include
`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.

## Validators (Standard Schema v1)

| Validator | Declared range | Exact version tested (lock-resolved) | Status |
|---|---|---|---|
| Zod | ^4.4.3 | 4.4.3 | ✅ unit/integration/fuzz suites (linux-x64) |
| Valibot | ^1.4.2 | 1.4.2 | ✅ unit/integration suites (linux-x64) |
| Any Standard Schema v1 implementation | spec ^1.1.0 | 1.1.0 | ✅ structural conformance suite (linux-x64) |

Validator coverage on macOS/Windows follows the CI matrix (typecheck +
conformance + security only); validator-specific integration suites execute
on Linux CI.

## Browser client (`lugas/client`)

| Environment | Status |
|---|---|
| Bun.build browser target → standalone Node execution with fetch stub | ✅ (linux-x64 CI; no Bun global references permitted by graph check) |
| Real browsers | ⚠️ not executed in CI — bundle-level proof only (source-graph browser-safety checks); no automation driver in beta scope |

## Explicit non-goals / unsupported

- Node.js running the server core or CLI (client bundles remain runtime-neutral).
- Bun ≤ 1.3.x or ≥ 1.5.x.
- Windows path behaviors beyond what Bun itself normalizes.

## How this was verified

- Matrix: `.github/workflows/compatibility.yml` — 3 OS × 2 Bun = 6 cells,
  all green. Authoritative merged-tree run (incl. this doc's verifier):
  [33021193847](https://github.com/ther12k/lugas/actions/runs/33021193847) @ `d9cfd08`;
  pre-PR candidate run: [33000006619](https://github.com/ther12k/lugas/actions/runs/33000006619) @ `5324aee`.
- Local deep verification (full `bun run verify`: typecheck, 605 tests incl.
  security/integration/conformance/docs/golden): linux-x64, Bun 1.4.0, TS 7.0.2.
- Matrix cells run: `bun install --frozen-lockfile`, `bun run typecheck`,
  unit+conformance tests, security tests.
