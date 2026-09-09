---
type: Architecture Decision Record
title: ADR-0023 — Server-Sent Events as a Native Response Helper
status: accepted
tags:
- adr
- architecture
- sse
- streaming
- '0023'
generated:
  by: zcode/glm
  at: '2026-09-09T00:00:00+07:00'
---

# ADR-0023 — Server-Sent Events as a Native Response Helper

## Status

Accepted by owner decision (ODR-0008, `docs/owner-decisions/m8-002-dispatch.md`, 2026-09-09), dispatching issue [#349](https://github.com/ther12k/lugas/issues/349) (M8-002) as the second milestone-8 battery. Fulfills the roadmap row "Server-Sent Events — planned core helper". The roadmap gate on lifecycle evidence is satisfied by M7-004 ([ADR-0020](0020-application-service-lifecycle.md)).

## Context

Server-initiated event streams (live updates, progress, notifications) are an HTTP response primitive, not an infrastructure product — they belong close to the core, built on web streams, with the wire format (`text/event-stream`, WHATWG "server-sent events") handled once and correctly. Hand-rolled SSE responses reconstruct the same frame serializer, mis-handle multi-line data, and — worst — leak timers, intervals, and subscriptions when the connection drops, because nothing ties producer teardown to connection death.

Two runtime facts (pinned by probe on Bun 1.4.0) make deterministic cleanup achievable without new machinery:

1. Every request carries a live `request.signal`, which aborts on **client disconnect**, and Bun aborts it (and cancels the response `ReadableStream`) on **server force-close** (`server.stop(true)`).
2. A response built from a `ReadableStream` invokes `cancel()` on those paths, so a cleanup registered inside the stream's cancellation runs exactly when the connection dies — the same hook the ADR-0020 drain already forces at deadline expiry.

## Decision

Lugas ships a **first-party SSE response helper** — `sse()` in the root subpath:

1. **Surface:** `sse({ start, heartbeatMs? })` returns a streaming `Response` with `Content-Type: text/event-stream; charset=utf-8` and `Cache-Control: no-cache`. `start(writer)` is called once when the stream opens; it may return a **cleanup function**, which is invoked **exactly once** when the stream ends by any path: `writer.close()`, client disconnect (signal abort → stream cancel), or server force-close. No hidden sessions, no reconnect state, no auto-heartbeat unless `heartbeatMs` is configured (then the helper owns the timer and clears it on the same cleanup path).
2. **Writer:** `send({ data, event?, id?, retry? })` serializes one event frame — `data` may be a string (emitted as one `data:` line per source line) or a JSON-serializable value (serialized with the same JSON semantics as [json()](0006-native-response-typed-helpers.md)); `comment(text)` emits heartbeat-style comment lines; `retry(ms)` emits a standalone retry hint; `close()` ends the stream gracefully. After close, cancel, or error, `send`/`comment`/`retry` return `false` instead of throwing — a late timer tick must never crash a request. `desiredSize` mirrors the underlying stream so producers can be backpressure-aware; `send()` itself never blocks (an unbounded producer against a stalled client grows the buffer — respecting `desiredSize` is the producer's documented responsibility).
3. **Serialization as a pure function:** the frame serializer is exported (`formatSseEvent`) — one implementation for the writer, tests, and alternate transports; the wire format (field order `id`, `event`, `retry`, `data` lines, blank-line terminator, UTF-8, CRLF/LF normalization of embedded newlines) is pinned by tests.
4. **Failure semantics:** invalid `sse()` configuration and invalid writer input throw stable diagnostics (`LUGAS_SSE_001`, `LUGAS_SSE_002`) at the public boundary — never bare `TypeError`s. A `start` that throws errors the stream: the client sees a connection failure and applies its own `EventSource` retry semantics; Lugas invents no error-frame protocol.
5. **Primitive, not product:** no event broker, no per-client fan-out, no persistence/replay, no `EventSource` polyfill in `lugas/client` (the browser consumes SSE natively). `last-event-id` is an ordinary request header applications read themselves. Fan-out architectures compose by holding writers in application-owned services.
6. **Composition with framework systems (verified, not assumed):**
   - The compile-boundary wrappers from [ADR-0022](0022-first-party-cors.md) apply to SSE responses as to any handler response: a configured CORS policy adds `Vary: Origin` and, for allowed origins, `Access-Control-Allow-Origin` to the stream headers.
   - The ADR-0020 traffic gate orders before any handler, so no SSE stream opens before service `init` settles.
   - An open SSE stream **is in-flight work** for the ADR-0020 drain: shutdown waits for it like any request. Applications that must exit promptly close their writers on shutdown (writers are plain application objects); on deadline expiry the force-close provably aborts signals and runs cleanups, preserving the deadline invariant (no disposal under continuing work).
7. **No routing impact:** `sse()` is a value a handler returns; no new route kinds, no `classifyRoute` changes, no manifest facts (`lugas-manifest-v1` stays method/provenance-only).

## Consequences

- Positive: the exact class of leak (timers/subscriptions outliving connections) that motivated the lifecycle milestone is prevented structurally for SSE, with the cleanup contract pinned by tests across all three end paths.
- Positive: one pinned frame serializer instead of per-app reimplementation; JSON data shares the framework's wire-honest serialization stance.
- Cost/tradeoff: `send()` is enqueue-only — producers ignoring `desiredSize` can buffer unboundedly against a stalled client; documented as a producer responsibility rather than solved with opinionated drop policies.
- Cost/tradeoff: no fan-out/replay primitives; applications needing them build on `service()` + writers, which keeps the core small per [ADR-0003](0003-minimal-explicit-agent-friendly-api.md).
- Compatibility effect: additive root-subpath exports (`sse`, `formatSseEvent`, types) — a protected-file change owned by the single M8-002 issue per ODR-0008; no existing behavior changes; `package.json`/`bun.lock` untouched.

## Alternatives considered

- Middleware/subscription product (broker, rooms, replay): rejected — infrastructure product, violates the roadmap's "HTTP response primitive" scoping and ADR-0003 minimality.
- Callback-based `onOpen/onClose` route option: rejected — spreads stream lifecycle across the route descriptor; the writer-with-cleanup-return keeps ownership in one function scope.
- Auto-close SSE streams at drain start: rejected — silently killing live streams contradicts the ADR-0020 deadline invariant (continuing work is never fabricated as complete); the deadline path already closes them explicitly.
- `pull`-based backpressure with drop policies: deferred — enqueue + `desiredSize` passthrough is honest and simple; opinionated drop strategies need evidence and a separate decision.

## Evidence

Pinned-oracle probes (Bun 1.4.0): `request.signal` present per request; client `AbortController` abort → signal abort + stream `cancel()`; `server.stop(true)` with an open stream → same. Implementation issue [#349](https://github.com/ther12k/lugas/issues/349) (M8-002) adds wire-format tests, exactly-once cleanup tests across close/abort/force-close, heartbeat lifecycle, CORS pairing, drain interaction, and diagnostics tests; evidence report `docs/reports/issues/M8-002.md`.

## Revisit trigger

If real deployments show stalled-client buffering problems, a backpressure amendment (drop policies, `pull`-based producers) needs its own decision with evidence. If a fan-out need recurs across applications, an optional adapter decision (never core) may follow.
