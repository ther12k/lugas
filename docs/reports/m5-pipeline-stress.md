---
type: Stress Report
title: M5 Pipeline Concurrency Stress
status: accepted
tags:
- stress
- concurrency
- guards
- m5
---

# M5 Pipeline Concurrency Stress

Platform: Linux x86-64, Bun 1.4.0, i5-13420H, 15 GB.
Duration: 10 repetitions of 50 concurrent requests with unique markers.

## Results

| invariant | assertion | result |
|---|---|---|
| No context bleed | Each response's `requestId` matches its own request header (50/50) | pass |
| No payload cross-contamination | Each response's `payload` matches its own request body (50/50) | pass |
| Each stage executes at most once per request | Unique handler-request pairs = N (no duplicates) | pass |
| Mixed async/sync guard resolution order | Async + sync guards both execute; no ordering violation detected | pass |

## Methodology

50 concurrent POST requests with unique `x-request-id` headers, distinct
payloads, and randomized async guard delays. The execution log is checked
for duplicate handler invocations. Response bodies are verified for
request-to-response identity mapping.

## Limitations

Single-process testing; multi-worker scenarios require M6 infrastructure.
Short-circuit settling is covered by existing suites (M2/M4R1-009).
