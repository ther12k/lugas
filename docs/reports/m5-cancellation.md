---
type: Stress Report
title: M5 Cancellation, Abort, and Slow Body Stress
status: accepted
tags:
- stress
- cancellation
- abort
- m5
---

# M5 Cancellation Stress

Platform: Linux x86-64, Bun 1.4.0.

## Results

| scenario | assertion | result |
|---|---|---|
| Abort before send | Rejects as transport failure; no fabricated result | pass |
| Abort during slow handler | Rejects with AbortError; no 4xx/5xx fabricated | pass |
| 10 sequential abort cycles | No unhandled rejections or resource leaks | pass |
| Partial JSON body | Produces 4xx (not 5xx) | pass |
| Empty body with declared schema | Produces 4xx (not crash) | pass |

## What Bun cancels vs application responsibility

Bun cancels the network connection on client abort. The framework does NOT
cancel the handler's async work — if a business mutation has already
committed before disconnect, that mutation remains committed. Retry/idempotency
is an application contract.
