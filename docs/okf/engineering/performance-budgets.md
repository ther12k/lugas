---
type: Engineering Standard
title: Performance, Size, and Startup Budgets
status: draft
tags:
- performance
- budgets
- size
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Performance, Size, and Startup Budgets

These are targets and investigation thresholds, not measured results.

## Runtime budgets

| Dimension | Target | Gate behavior |
|---|---:|---|
| Plain sync route median latency overhead vs raw Bun | ≤ 10% | investigate and redesign before accepting higher cost |
| Plain sync route p99 overhead | ≤ 15% | blocks performance claims; may block beta if severe |
| Guard-only overhead | documented and proportional | no hidden parsing/allocation |
| Unused body parsing | zero | hard correctness gate |
| Sync handler promise plumbing | zero avoidable promise chain | verified by tests/benchmarks |
| Static native response wrapping | none | hard conformance gate |

## Startup and memory

- Startup must scale with declared routes without request-time router construction.
- 1,000 and 10,000 routes receive cold-start and memory reports.
- Lugas overhead over equivalent raw Bun route tables must be isolated.
- No absolute millisecond target is published before hardware-backed evidence.

## Size targets

| Artifact | Minified | Gzip | Notes |
|---|---:|---:|---|
| Server core used by basic app | ≤ 20 KB | ≤ 7 KB | target, excluding Bun runtime |
| Client | ≤ 6 KB | ≤ 3 KB | browser-safe target |
| Testing/CLI | reported separately | not production core | optional exports |

## Type budgets

- 500-route fixture must remain within the accepted wall-time/memory threshold selected in M3-017.
- 1,000-route results must be disclosed.
- A release cannot improve runtime by making editor cost unbounded.

## Regression policy

CI microbenchmarks may be noisy; they flag regressions rather than make release claims. Stable release evidence runs on controlled hardware. Any budget waiver requires an ADR with user-visible benefit and measured alternatives.
