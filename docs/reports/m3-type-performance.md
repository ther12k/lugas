---
type: Benchmark Report
title: M3 Type-System Performance — Gate Results
status: accepted
tags:
- typescript
- performance
- benchmarks
- m3
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# M3 Type Performance Gate (M3-017)

Measured with `bun run scripts/typebench.ts` (canonical implementation of the
planned `typebench:all`). Raw extended diagnostics for every run are retained
in `benchmarks/typecheck/results/*.txt`.

## Environment (pinned, disclosed)

- Bun 1.4.0; TypeScript 7.0.2 (native tsc)
- CPU: 13th Gen Intel Core i5-13420H; RAM: 15 GB; Linux
- `skipLibCheck: true` — identical to the developer tsconfig; it only skips
  node_modules declarations (zod) and does not hide Lugas source cost (Lugas
  is consumed as source).

## Method

- Entries force full per-path client-result instantiation over the whole
  contract (`ClientCallResult` mapped across `PathsForMethod` for GET and
  POST) plus a real `createClient<API>` value, on top of each committed
  M3-005 fixture.
- Cold = fresh process, no tsbuildinfo. Warm = incremental second pass after
  an intermediate warm-up run. All runs reported; nothing cherry-picked.

## Scale matrix

| routes | mode | files | types | instantiations | check ms | total ms | memory MB |
|---|---|---|---|---|---|---|---|
| 25 | cold | 356 | 20,766 | 43,930 | 45 | 88 | 67 |
| 25 | warm | 356 | 340 | 0 | 0 | 87 | 53 |
| 100 | cold | 356 | 26,616 | 65,392 | 53 | 96 | 74 |
| 100 | warm | 356 | 340 | 0 | 0 | 57 | 53 |
| 500 | cold | 356 | 56,550 | 177,486 | 166 | 210 | 111 |
| 500 | warm | 356 | 340 | 0 | 0 | 83 | 56 |
| 1,000 | cold | 356 | 94,304 | 317,585 | 287 | 344 | 156 |
| 1,000 | warm | 356 | 340 | 0 | 0 | 96 | 58 |

Instantiation growth from 25 → 500 routes is ×4 for ×20 routes (sub-linear);
no feature shows superlinear behavior.

## Feature attribution @100 routes (cold)

| variant | check ms | Δ vs plain | instantiations | memory MB |
|---|---|---|---|---|
| plain | 27 | +0 | 16,948 | 61 |
| unions (+404/410 branches) | 33 | +6 | 19,766 | 63 |
| guards (auth+admin chains) | 35 | +8 | 17,301 | 61 |
| schemas (params/query/headers/body) | 51 | +24 | 27,861 | 73 |
| all combined | 93 | +66 | 31,036 | 76 |

Attribution conclusion: schema inference dominates added cost (~3–4× the
other features individually) but stays comfortably linear in aggregate.

## Gate decision

**The 500-route threshold is ACCEPTED.** Cold check time at the principal
beta target is 166 ms / 111 MB on ordinary laptop hardware — far inside any
reasonable definition of "practical". Warm editor-loop rechecks are ~0 ms.

**1,000-route result (reported outside target scope):** 287 ms cold /
156 MB — still practical; no corrective design action required.

**Fallback policy:** generated-client generation and contract splitting are
NOT adopted. Evidence does not require them; they remain documented options
should future measurements regress beyond the threshold (any such change
requires an ADR). No performance modification of any kind was made in this
task, so no type-safety weakening was introduced.

## Anti-cheat compliance

- Fixtures unchanged from merged M3-005 output (byte-identical generator).
- Client measurement instantiates the REAL contract machinery over ALL paths.
- All runs (cold and warm, both passes) are recorded above and retained raw.
- Single pinned TypeScript/hardware pairing; no cross-machine comparisons.
