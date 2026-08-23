---
type: Benchmark Report
title: M4 Test-Server Lifecycle — Cleanup, Failure, and Leak Results
status: accepted
tags:
- testing
- lifecycle
- stress
- m4
---

# M4 Test-Server Lifecycle Report (M4-008)

Environment (pinned): Bun 1.4.0, TypeScript 7.0.2, Linux x86-64
(i5-13420H, 15 GB). Suite: `tests/stress/test-server-cleanup.test.ts`,
run standalone and with the mandated `--repeat 20`.

## Results

| Scenario | Assertion | Result |
|---|---|---|
| Forbidden-option startup failure | Throws pre-listen; explicit port immediately reclaimable | pass |
| Exception mid-test with `finally`/`dispose` | Rejects as expected; server unreachable afterwards | pass |
| Stop during in-flight slow request | No fabricated success; port released | pass |
| Abort during slow request + immediate stop | Rejects promptly; port released | pass |
| Explicit-port dual bind | Platform hazard recorded (below); both instances stoppable/idempotent; survivor undisturbed | pass |
| 12 concurrent instances, exception in one branch | All unreachable after cleanup | pass |
| `--repeat 20` full-file stability | 6×20 = 120 executions, 0 failures | pass |

## Platform truths recorded (Bun 1.4.0 / Linux)

1. **Dual-binding an explicit port succeeds** via SO_REUSEPORT-style reuse.
   Which listener answers a connection is opaque (kernel/keep-alive
   dependent) — isolation on explicit-port reuse must never be assumed by
   user code.
2. **`stop(true)` does not abort in-flight handler completions** on this
   platform: a sleeping handler still finishes server-side. Clients observe
   connection closure per socket state, not handler cancellation.
3. Stopping one of several listeners never disturbs survivors; stop is
   idempotent across instances.

## Limitations

- No public Bun API enumerates active servers/handles; leak detection here
  is behavioral (connect-failure probes), which is the strongest portable
  signal available.
- macOS/Windows untested in this environment; socket-reuse semantics may
  differ and would surface through these same assertions.
- Handler-cancellation observability remains M5-013 scope.
