---
type: Architecture Decision Record
title: 'ADR-0036 — Bounded SSE Producer Backpressure'
status: accepted
tags:
- adr
- architecture
- sse
- streaming
- backpressure
- '0036'
generated:
  by: zcode/glm
  at: '2026-09-12T00:00:00+07:00'
---

# ADR-0036 — Bounded SSE Producer Backpressure

## Status

**Accepted** — scope directed by the owner (2026-09-12, this task's
instruction): bounded, byte-based producer backpressure for the SSE
primitive, recorded through the ADR process before implementation per the
governance boundary that observable behavior is not an invisible
optimization. This ADR does not widen [ODR-0018]: the work is additive
ergonomics on the shipped M8-002/ADR-0023 primitive, not pre-0.1.0 program
work such as [ADR-0035].

## Context

`sse()` (ADR-0023) exposes `writer.send()`, which enqueues without blocking;
the writer documents `desiredSize` and leaves flow control entirely to the
producer. Every streaming application must therefore re-implement the same
capacity logic or risk unbounded framework-owned buffering against a slow
reader. A connected-but-stalled reader (TCP zero window) is distinct from a
disconnected one: cancellation never fires, so nothing bounds the queue.
ADR-0023 deliberately kept replay/fan-out/persistence out; this ADR stays
inside that boundary — it bounds the helper's own queue, nothing else.

## Scope boundary (precise claim)

The budget bounds **the SSE response stream's queued encoded bytes** — the
payload the framework retains between enqueue and consumer read. It does NOT
bound total process memory, native socket buffers, temporary serialization
allocations, or application-owned upstream queues. Illustration, not a
measured Lugas result: 1,000 connections × 64 KiB allowance is 62.5 MiB of
queued payload alone — the per-connection choice matters.

## Decision

1. **Byte budget, not event count:** new opt-in `sse()` config key
   `queueByteLimit` (positive integer bytes, `LUGAS_SSE_001` on violations).
   When set, the response stream is created with a byte-length queuing
   strategy (high-water mark = `queueByteLimit`), so `desiredSize` — and all
   waiting decisions — are byte-based, not chunk-count-based. Without the
   option, stream construction and `desiredSize` semantics are exactly as
   shipped (chunk-count default; byte accounting is not meaningfully
   observable there).
2. **Cooperative waiting:** new writer method
   `sendAwait(input): Promise<boolean>`. Synchronous event validation is
   unchanged (`LUGAS_SSE_002` throws). Resolves `false` once the stream has
   ended; resolves `true` after the encoded event is enqueued. When the
   queue is at/over budget the promise parks and resolves when capacity
   returns (consumer progress) or the stream ends (`false`). FIFO order is
   preserved across parked events. A single event larger than the remaining
   budget is still enqueued once capacity exists — otherwise it could never
   be sent; the budget bounds steady-state queueing, not the largest single
   event.
3. **Bounded waiting, not a second unbounded queue:** parked `sendAwait`
   frames are encoded once and retained outside the stream queue under an
   explicit cap — parked bytes may not exceed `queueByteLimit`; a call
   arriving beyond it resolves `false` immediately (the declared overload
   outcome: the event was not accepted; nothing was dropped silently from
   the middle of the stream). Total framework-owned retained payload is
   therefore ≤ `queueByteLimit` (stream queue) + `queueByteLimit` (parked)
   + the largest single event. A compliant producer that awaits each call
   keeps at most one event parked.
4. **`send()` is unchanged — the explicit escape hatch:** the synchronous
   contract (non-blocking, enqueues, `false` only when ended) is frozen.
   With `queueByteLimit` set, `send()` still bypasses the wait; producers
   choose it deliberately and keep today's responsibility. No silent
   redefinition of existing behavior; applications without the new keys see
   no change (and no new timers or per-request work).
5. **Deterministic settlement:** stream end by any path (`writer.close()`,
   client disconnect/abort, server force-close) resolves every parked
   `sendAwait` with `false` promptly and runs cleanup exactly once
   (extending the CA-2 fix's guarantees to parked producers).
6. **Heartbeats skip while congested:** with `queueByteLimit` set, a due
   heartbeat is skipped when the queue is at/over budget or events are
   parked — skipped, never accumulated for later delivery (a heartbeat
   backlog would reintroduce the growth the budget exists to prevent).
   Without the option, heartbeat behavior is unchanged.
7. **Observability:** the writer exposes `queuedBytes` (bytes retained in
   the stream queue; `null` without `queueByteLimit` — byte accounting
   requires the byte-based strategy) and `pendingSendBytes` (retained
   parked event bytes), so the bound is testable and operable, not
   implied.

## Non-goals

- No claim about total process memory, socket buffers, or allocator
  behavior; the earned performance claim is a bounded framework-owned
  queue, verified by deterministic queue tests.
- No change to `send()` semantics, framing, cleanup, heartbeat timing
  semantics without the new key, or the ADR-0023 primitive boundary (still
  no broker, fan-out, replay).
- No drop-without-trace policy: overload resolves `false` explicitly; what
  a producer does with a `false` is application policy.

## Consequences

- Positive: the acceptance goal — "a stalled consumer cannot cause
  unbounded framework-owned buffering, and disconnecting it releases the
  associated producer resources promptly" — becomes a framework guarantee
  for `sendAwait` + `queueByteLimit` users, with deterministic tests
  (queue bound, overflow outcome, settlement on disconnect, heartbeat
  skip) plus a served stalled-consumer test.
- Cost/tradeoff: one more config key and writer method on a deliberately
  small surface; accepted because every streaming application otherwise
  re-implements the same flow control.
- Compatibility: purely additive. `send()`, framing, cleanup, and default
  stream construction are unchanged; `docs/sse.md` documents the new
  contract and the escape hatch.

## Evidence

Implementation lands with: deterministic writer-level tests (byte bound
held against a stalled reader; parked-byte cap and explicit `false`
overload; oversized single event; disconnect/close settlement with
exactly-once cleanup; heartbeat no-growth while congested and resumption
after drain; no timers for applications not using heartbeats) and one
live-server stalled-consumer test (read-then-stall, bounded retained
bytes, prompt cleanup on abort). Queue counters do not claim total-memory
behavior; CPU/memory trend observation is reported separately and
qualitatively.

## Revisit trigger

A standardized consumption-progress signal from the platform, or evidence
that parked-frame retention must be observable per-event, amends this
record.
