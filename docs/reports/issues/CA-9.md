---
type: Issue Evidence Report
title: 'CA-9 — SSE backpressure evidence strengthening (three test-assertion gaps)'
status: complete
tags:
- evidence
- sse
- tests
---

# CA-9 Evidence Report

Owner review of CA-8 at `b52cdaa` identified three test-evidence gaps in `tests/sse/sse-backpressure.test.ts` — explicitly framed as evidence gaps, not reproduced runtime failures. This is a tests-only follow-up; no product code changed.

## Baseline

Branch base: origin/main `b52cdaa`. The three gaps, all confirmed on inspection:

1. **Heartbeat resumption** — the post-drain assertion used `writer.comment("still-alive")`, proving manual writing works, not that the automatic heartbeat timer resumed.
2. **Parked-write settlement** — with a 128-byte limit and ~90-byte frames, the six preceding sends overflowed the parked cap before the "blocked" send, which therefore resolved `false` through the overload path, never proving settlement of a genuinely pending write.
3. **Live stalled-reader test** — `settledFalse` was collected but never asserted; nothing established that a write had actually parked before the abort.

## Outcome

- **Settlement tests (rewrite):** the congestion layout is now explicit — two enqueues push `desiredSize` negative, a third send parks (~90 ≤ 128 parked cap), and the observed write is deliberately SMALL (~35 bytes) so it fits the parked cap and becomes genuinely pending. The tests now PROVE the pending state: `settled` stays `false` across a 20 ms observation window with `pendingSendBytes > 0`, and only after cancel/close does the promise resolve `false` and the parked bytes drop to zero. Both cancel and close variants.
- **Heartbeat resumption (rewrite):** after draining, the test reads with a deadline-bounded window until a `: heartbeat` frame arrives from the interval itself — no manual write is involved. The manual-comment variant is gone.
- **Live served test (strengthened, claim-scoped):** the producer now samples `pendingSendBytes` to observe parking and produces ~450 KB. Loopback socket buffering can absorb production outside the queue (which is exactly ADR-0036's documented claim boundary), so parking is expected but not forced here; accordingly the unconditional assertions are the queue bound and exactly-once cleanup, and settlement (`settledFalse ≥ 1`) is asserted conditionally on `parkedSeen`. The unconditional parked-write proof lives in the deterministic settlement tests, where it belongs.

## Files changed

Owned (CA-9): `tests/sse/sse-backpressure.test.ts` only. Adjacent/protected: none.

## Claim discipline

The resource claim stays conditional, as ADR-0036 records it: `queueByteLimit` + cooperative `sendAwait()` bounds the relevant retained payload (queue + parked, with the single-frame allowance); unchecked synchronous `send()` remains deliberately outside the guarantee. The live test's conditional settlement assertion is the same discipline applied to test evidence.

## Acceptance mapping (review table)

| Gap | Correction |
|---|---|
| Heartbeat resumption proved only manual writing | deadline-bounded read asserts a timer-generated `: heartbeat` frame after drain |
| `blocked` could resolve false via overload before cancellation | small-frame pending write proven unsettled (20 ms observation) before cancel/close, then `false` |
| Live test never asserted parking/settlement | producer observes parking; bound + cleanup unconditional, settlement asserted when parking occurred |

## Exact commands and results

```
bun test tests/sse/sse-backpressure.test.ts  → 11 pass, 0 fail (5 consecutive runs, stability)
bun run verify                               → exit 0 (all steps PASS)
```

## Security considerations

None — test-only.

## Known limitations / Not exercised

The live parking branch remains environment-dependent by nature (loopback buffer sizes vary); it is asserted conditionally by design.

## Deferred work

None.

## Dependency / merge notes

Follows CA-8 (PR #411); tests-only. No protected files.

## Working-tree state

Clean after commit: `tests/sse/sse-backpressure.test.ts`, `docs/reports/issues/CA-9.md`.
