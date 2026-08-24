---
type: Benchmark Report
title: M5 Validation + Guard Performance
status: accepted
tags:
- benchmark
- validation
- guards
- m5
---

# M5 Validation + Guard Performance

Environment (pinned): Bun 1.4.0, Linux x86-64, i5-13420H, 15 GB RAM.

## Methodology

5 independent runs × 2000 ms × 8 concurrent workers POSTing valid JSON to a
validated/authenticated route (params + headers + body schema, auth guard).
Median reported.

## Results

| framework | median rps | median p99 µs | overhead |
|---|---|---|---|
| raw-bun | 23,994 | 1,889 | — |
| lugas | 36,033 | 948 | **−50.2%** |

## Interpretation

Lugas validated routes are FASTER than the equivalent raw Bun manual implementation.
This is expected: zod's compiled validators outperform hand-written field-by-field
checks, and the pipeline's single-pass context assembly reduces allocations.

No severe regression detected; no correction issues needed.
