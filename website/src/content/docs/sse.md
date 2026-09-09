---
title: "Server-Sent Events"
description: "Streaming responses with the sse() helper and deterministic cleanup."
---
`sse()` builds a streaming `text/event-stream` response on web streams, with
the wire format and the producer lifecycle handled once and correctly. It is
a primitive, not a product: no broker, no fan-out, no replay, no reconnect
state — the browser's native `EventSource` is the client.

```ts
import { route, sse } from "lugas";

route({
  handler: (ctx) =>
    sse({
      heartbeatMs: 15_000, // opt-in comment heartbeat; timer owned by the helper
      start: (writer) => {
        writer.retry(3000);                       // reconnect hint
        writer.send({ data: "connected" });       // first byte flushes the headers
        const subscription = bus.subscribe((event) => {
          writer.send({ id: event.id, event: "update", data: event.payload });
        });
        return () => subscription.unsubscribe();  // deterministic cleanup
      },
    }),
});
```

## Wire format

One frame per event, field order `id`, `event`, `retry`, `data`, terminated
by a blank line; multi-line data becomes one `data:` line per source line
(CRLF/CR normalized); `data` is a string as-is or a JSON-serializable value
(same `JSON.stringify` semantics as `json()` — non-finite numbers serialize
as `null`). The serializer is exported as a pure function
(`formatSseEvent`) for tests and alternate transports.

## The cleanup contract (the point of the helper)

`start(writer)` runs synchronously inside `sse()` — before any wire bytes.
Return a function and it runs **exactly once** when the stream ends by any
path:

- `writer.close()` (graceful, server-initiated);
- **client disconnect** — Bun aborts `request.signal`, which cancels the
  response stream (pinned by probe on Bun 1.4.0);
- **server force-close** — `server.stop(true)` and the ADR-0020 drain-deadline
  expiry take the same path.

The heartbeat timer, if configured, is cleared on the same path. This is the
structural fix for the classic SSE leak: intervals and subscriptions that
outlive their connection.

## Writer

| Method | Behavior |
|---|---|
| `send({ data, event?, id?, retry? })` | Serializes one frame; returns `false` once the stream has ended (never throws for late sends) |
| `comment(text)` | Single-line comment (e.g. heartbeats); same `false`-after-end |
| `retry(ms)` | Standalone reconnect hint frame |
| `close()` | Ends the stream gracefully and runs the cleanup |
| `desiredSize` | Mirrors the underlying stream; `null` once ended |

Backpressure is explicit: `send()` enqueues and never blocks, so an
unbounded producer against a stalled client grows the buffer — poll
`desiredSize` and pause when it drops low.

## Failure semantics

- Invalid configuration (`LUGAS_SSE_001`) and invalid writer input
  (`LUGAS_SSE_002`) throw stable diagnostics — never bare `TypeError`s.
- A `start` that throws surfaces through the route's error policy as a
  redacted `500` Problem Details — never a silent empty-200.
- Response headers flush with the first written byte: open with an initial
  event, `retry`, or comment rather than sitting idle.

## Composition with framework systems

- **CORS (ADR-0022):** stream responses pass through the same compile-boundary
  wrappers — `Vary: Origin` plus `Access-Control-Allow-Origin` for allowed
  origins.
- **Lifecycle (ADR-0020):** an open stream is in-flight work; the drain waits
  for it. Close writers on shutdown for prompt exits, or rely on deadline
  force-close (which runs cleanups). Both paths are pinned by tests.
- **Manifest:** unchanged — `sse()` is a value a handler returns; no new
  route kinds or manifest facts.
- **`last-event-id`:** an ordinary request header — read it from the handler
  context and resume your own stream state.

Evidence: `tests/sse/format.test.ts`, `tests/sse/sse.test.ts`;
`docs/reports/issues/M8-002.md`.
