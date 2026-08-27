---
type: Compatibility Report
title: M6 Bun 1.4 Compatibility Matrix — Beta Candidate
status: complete
tags:
- compatibility
- m6
- release
---

# M6 Compatibility Matrix — Final

Two distinct runs matter and must not be conflated:

| Run | Commit | What it proves |
|---|---|---|
| [33000006619](https://github.com/ther12k/lugas/actions/runs/33000006619) | `5324aee` (pre-PR beta candidate) | 6/6 matrix cells green on the compatibility payload itself |
| **[33021193847](https://github.com/ther12k/lugas/actions/runs/33021193847)** | `d9cfd08` (merged tree incl. verifier step) | **final merged-tree result including `verify:compatibility-report`** — the authoritative reference |

## Matrix evidence (CI, `.github/workflows/compatibility.yml`)

Merged-tree run 33021193847 — **all 6 cells green**, now also executing
`tests/cli/` per cell (CLI is spawn/signal-heavy where platforms differ):

| OS \ Bun | 1.4.0 | 1.4.x (latest patch) |
|---|---|---|
| ubuntu-latest | ✅ success | ✅ success |
| macos-latest | ✅ success | ✅ success |
| windows-latest | ✅ success | ✅ success |

Per-cell jobs: env archival (`bun --version`, runner OS/arch) → verifier →
typecheck → unit+conformance → CLI tests → security tests.
Run history: every workflow invocation across the M6R2 series concluded
`success` (10+ consecutive green runs).

Exact resolved Bun versions per cell are archived in each run's job summary;
on the local linux-x64 verification cell the resolved version was **1.4.0**
(`1.4.x` selector cells resolve at run time by design — setup-bun pins latest 1.4 patch).

## Deep local verification (linux-x64)

Full gate on the exact candidate: `bun test` → **605 pass / 0 fail /
1 documented skip**; typecheck clean; OKF docs clean. Covers integration,
security, fuzz, golden, conformance, and type suites — deeper than the matrix
cell scope by design (matrix runs a fast portable subset).

## Skip/failure disposition (complete)

| Item | Disposition |
|---|---|
| `error-redaction.test.ts` baseline skip (1 test) | Intentional: asserts Bun's raw-route dev-page leak behavior that only manifests in standalone processes; rationale + standalone probe recorded in `docs/reports/issues/M1-014.md`. Lugas's own redaction contract is fully tested un-skipped. No unresolved failures exist. |

## User-facing compatibility table

Published as [`docs/compatibility.md`](../compatibility.md): exact supported
combos (Bun 1.4.0 and current 1.4.x patch × linux/macos/windows for the
server core; TS 7.0.2; Standard Schema v1 validators incl. zod ^4.4.3 and
valibot ^1.4.2), explicit non-goals (Node server core, other Bun majors,
real-browser execution beyond bundle-level proof), and generation source.

## Badge data

- Compatibility badge URL: `https://github.com/ther12k/lugas/actions/workflows/compatibility.yml/badge.svg`
- CI badge URL: `https://github.com/ther12k/lugas/actions/workflows/ci.yml/badge.svg`

## Limitations

- Matrix cells exercise typecheck + unit/conformance + CLI + security; the deepest
  suites (integration/package-consumers/benchmarks) remain Linux-only CI-local —
  acceptable for beta per the portable-subset strategy; full-matrix depth is a
  post-beta improvement.
- actions/checkout was raised v4→v5 in this correction (Node20 deprecation warnings).
- The "1.4.x" cell tracks the latest 1.4 patch available at run time; the
  release-date rerun requirement (M6-009) re-executes this matrix near GA.

## Commands executed

```text
bun test                        # 605 pass, 0 fail, 1 skip (documented)
bun run verify                  # exit 0 (typecheck/test/docs/diff/perf-gate-skip)
gh run list/view compatibility.yml   # per-cell conclusions recorded above
```
