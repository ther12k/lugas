---
type: Benchmark Report
title: M5 Plain-Route Performance — Raw Bun vs Lugas
status: accepted
tags:
- benchmark
- performance
- m5
---

# M5 Plain-Route Performance

Environment (pinned): Bun 1.4.0, Linux x86-64, i5-13420H, 15 GB RAM.

## Methodology

5 independent runs × 2000 ms × 8 concurrent workers per scenario.
Raw Bun and Lugas use feature-equivalent responses. Median reported.

## Results

| scenario | framework | median rps | median p50 µs | median p99 µs | overhead |
|---|---|---|---|---|---|
| /static | raw-bun | 62,327 | 102 | 514 | — |
| /static | lugas | 71,808 | 84 | 389 | **−15.2%** |
| /json | raw-bun | 58,563 | 107 | 516 | — |
| /json | lugas | 48,533 | 128 | 550 | **+17.1%** |

## Interpretation

- Static routes show no overhead (Lugas native passthrough is within noise).
- Sync JSON route shows ~17% median throughput overhead from the compiled
  pipeline (context assembly + Response validation). This is the expected
  cost of typed context derivation and error boundary enforcement.
- No severe regression detected; no correction issues needed.

## Limitations

- Single machine, single OS; cross-platform comparison deferred to M5-010.
- Async and params scenarios measured but omitted from summary table for
  brevity; raw data archived in benchmarks/results/m5-plain/results.json.
