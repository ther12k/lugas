---
type: Engineering Standard
title: Reproducible Benchmark Methodology
status: draft
tags:
- benchmark
- methodology
- performance
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Reproducible Benchmark Methodology

## Principles

Benchmarks answer narrowly defined questions. They do not establish universal framework rankings.

## Environment record

Every report includes:

- timestamp and source commit;
- OS/kernel and architecture;
- CPU model/core configuration;
- memory;
- Bun and TypeScript versions;
- power/performance mode;
- command line and environment variables;
- dependency lock hash;
- warmup, duration, sample count, concurrency, and request body size;
- raw output files and analysis script hash.

## Runtime scenarios

1. Native static response.
2. Plain synchronous JSON route.
3. Async JSON route.
4. Params route.
5. Query validation.
6. JSON body validation.
7. Guard-only route.
8. Validation plus guard plus domain response.
9. Error/Problem Details route.
10. 1,000 and 10,000 route startup/memory.

Compare raw Bun, Lugas, and an idiomatic pinned Elysia fixture only where behavior is feature-equivalent.

## Metrics

- cold process startup to readiness;
- memory at readiness and under load;
- requests/second with confidence interval;
- median, p95, and p99 latency;
- CPU time;
- allocations/heap evidence where available;
- package and bundled size;
- TypeScript compile metrics in a separate report.

## Statistical policy

- At least five independent process runs for milestone evidence; more for noisy results.
- Report median and spread, not only the best run.
- Randomize or alternate implementation order to reduce thermal/order bias.
- Separate warm throughput from cold start.
- Retain raw data.

## Fairness

- Same handler result and validation policy.
- Same port/TLS/keepalive/compression settings.
- Same client/load generator and machine.
- No competitor debug mode or unnecessary middleware.
- No Lugas route that skips work performed by the comparator.
- Disclose framework-specific optimizations.

## Claim policy

Only claims supported by the exact measured scenario may be published. “Near-native” requires the accepted overhead budget across representative routes, not one static response.
