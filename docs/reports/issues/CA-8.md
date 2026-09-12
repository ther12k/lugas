---
type: Issue Evidence Report
title: 'CA-8 — Bounded SSE producer backpressure (ADR-0036)'
status: complete
tags:
- evidence
- sse
- streaming
- backpressure
---

# CA-8 Evidence Report

Implements the owner-directed next roadmap item: "a stalled consumer cannot cause unbounded framework-owned buffering, and disconnecting it releases the associated producer resources promptly." Scope recorded through the governance process BEFORE implementation: ADR-0036 (`docs/okf/decisions/0036-sse-bounded-backpressure.md`, status accepted citing owner direction 2026-09-12) landed as the branch's first commit; this is the second.

## Baseline

Branch base: origin/main `19ff008` (after CA-7, PR #410).

`sse()` exposed `desiredSize` but `send()` enqueued without any capacity enforcement; the docs made producers responsible for flow control. A connected-but-stalled reader (TCP zero window — no cancellation) could grow the framework-owned queue without bound. #404's heartbeat fix addressed timer lifecycle, not buffering.

## Outcome

Additive, per ADR-0036 (all seven decision points):

1. `queueByteLimit` (positive-integer bytes, `LUGAS_SSE_001` on violations) — when set, the response stream uses a byte-length queuing strategy (HWM = budget), so `desiredSize` and all waiting decisions are byte-based. Without it: stream construction, `desiredSize`, and heartbeat behavior byte-for-byte as shipped.
2. `writer.sendAwait(input): Promise<boolean>` — sync validation unchanged (`LUGAS_SSE_002` throws); `true` once enqueued; `false` on stream end; parks FIFO while at/over budget and resolves on consumer progress (`pull`) or settlement. A single event larger than the remaining budget still sends once capacity exists.
3. Parked frames are encoded once and capped at `queueByteLimit` retained bytes — beyond it, `sendAwait` resolves `false` immediately (the declared overload outcome). Total framework-owned retained payload ≤ queue budget + parked budget + largest single event. Waiting is not a second unbounded queue.
4. `send()` is untouched (non-blocking, enqueues, escapes the budget by choice) — the frozen escape hatch; pinned by test even under `queueByteLimit`.
5. Settlement: close, client disconnect/cancel, or force-close resolve every parked waiter `false` promptly; cleanup runs exactly once (extends CA-2's guarantees to parked producers).
6. Heartbeats skip while congested (budget mode only) — skipped, never accumulated; pinned by a no-growth assertion across ticks, with resumption verified after drain.
7. Observability: `writer.queuedBytes` (`null` without the budget — no byte-accounting claim is made there; `0` once ended) and `writer.pendingSendBytes`.

## Claim discipline (review point 3)

The earned, tested claim is: **the framework-owned queue is bounded under stalled consumption** (deterministic) and **disconnect releases producer resources promptly** (served test: cleanup exactly once, waiters settled). No total-process-memory, socket-buffer, or throughput claim is made; queue counters do not proxy memory. The 1,000 × 64 KiB figure in the ADR is arithmetic illustration, not a measurement.

## Files changed

Owned (CA-8):

- `docs/okf/decisions/0036-sse-bounded-backpressure.md` (new, commit 1) + index entry
- `src/core/sse.ts` — config key + validation, byte strategy, waiters/`sendAwait`/flush-on-pull, settlement in `runCleanup`, congestion-aware heartbeat, `queuedBytes`/`pendingSendBytes`
- `tests/sse/sse-backpressure.test.ts` (new) — the acceptance matrix below
- `docs/sse.md` — writer table rows + "Bounded backpressure (ADR-0036)" section
- `llms.txt`, `llms-full.txt`, `skills/lugas/SKILL.md` — regenerated

Adjacent: none. Protected: none.

## Acceptance mapping (review matrix)

| Scenario | Requirement | Test |
|---|---|---|
| Healthy reader | order/content preserved; first-event latency measured | order + content asserted; latency sampled (< 1 s bound, tolerance-stated) |
| Stalled reader | framework queue within declared bound | deterministic: `queuedBytes ≤ limit + largest event`; total retained ≤ 2·limit + largest event |
| Producer ignores pressure | declared overload outcome; no hidden backlog | parked-cap `false` outcomes counted; `pendingSendBytes ≤ limit`; `send()` escape hatch pinned unchanged |
| Disconnect during blocked write | waiters settle; cleanup exactly once | cancel → `false`, `pendingSendBytes` 0, cleanups 1; close variant; served live variant |
| Heartbeat + congestion | no growing backlog; #404 coverage intact | no-growth across ~4 ticks while congested; resumption after drain; existing `sse.test.ts` (incl. CA-2 test) green |
| Application without SSE behavior | no new timers/per-request work | interval spy: `queueByteLimit` alone creates 0 timers; `queuedBytes === null` without budget |

Live served test: client reads one chunk then stalls; producer's max retained stays ≤ 2048·2+128; abort → cleanup exactly once.

## Exact commands and results

```
bun test tests/sse/            → 32 pass, 0 fail
bun run typecheck              → PASS
bun run verify                 → exit 0 (all steps PASS)
```

## Security considerations

None — no new parse surface or headers; diagnostics unchanged (no new codes; message wording for `LUGAS_SSE_001` allowed-keys updated, wording is mutable per the frozen-codes policy).

## Known limitations / Not exercised

- Without `queueByteLimit`, `sendAwait` parks against the default chunk-count HWM and parked bytes are observable but uncapped (documented: a hard byte bound requires the budget). Fire-and-forget producers without a budget retain the pre-existing responsibility.
- CPU/process-memory trends under many stalled connections were not charted; the served test observes timing qualitatively. A load-scale memory study remains performance-gate work, deliberately out of scope here.

## Deferred work

- Replay/fan-out/persistence stay application-owned (ADR-0023 boundary, unchanged).
- Static/SPA hosting and the Vite/React starter remain the next roadmap items (owner's sequence).

## Dependency / merge notes

- After CA-7 (PR #410). ADR commit precedes implementation commit in-history per the governance boundary. `docs/sse.md` and ADR-0023-compatible; ODR-0018 not widened (post-0.1.0 program untouched).

## Working-tree state

Clean after commit: files listed above plus `docs/reports/issues/CA-8.md`.
