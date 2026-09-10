---
type: Guide
title: Telemetry
status: current
tags:
- guide
- telemetry
- opentelemetry
- observability
---

# Telemetry

`defineApp({ telemetry })` adds dependency-free observability hooks: two explicit callbacks receiving scalar-only request events. Applications that adopt OpenTelemetry get correct spans — including detached work and error attribution — through a ~20-line adapter; everyone else gets zero new weight. The framework emits **facts**; your exporter does the shipping. See [ADR-0032](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0032-telemetry-hooks.md).

## The two events

```ts
import { defineApp, route, json } from "lugas";

export default defineApp({
  telemetry: {
    onRequestStart: (e) => {
      // e.kind === "request.start"
      // e.method, e.path, e.route ("GET /users/:id"), e.requestId?
    },
    onRequestEnd: (e) => {
      // e.kind === "request.end" — everything above, plus:
      // e.status, e.durationMs, e.errorClass?
    },
  },
  routes: { /* … */ },
});
```

| Field | Present | Notes |
|---|---|---|
| `method`, `path` | both events | The wire truth. |
| `route` | both events | The route id (`"GET /users/:id"`); `"-"` for unmatched requests. |
| `requestId` | both events | Present when `logging.requestIds` is enabled — one identity source: the same id appears in the `x-request-id` header and the access log. |
| `status` | end | The response status. |
| `durationMs` | end | From request entry to end-of-work (see boundary below). |
| `errorClass` | end | `"guard"` (401/403), `"framework"` (400/413/415/422), `"not-found"` (404), `"handler"` (other 4xx/5xx incl. redacted 500s); `undefined` under 400. |

**Redaction by construction** — the [logging](./logging.md) field discipline extended: headers, bodies, cookies, params, and query never appear in events. An authorization header, a session cookie, a query token: none of them can leak, structurally.

## The end boundary includes tracked work

`request.end` fires when the response is produced **and** any work the request registered through `track()` has settled — the same boundary the graceful drain waits on ([services](./services.md)). Detached work is correlated by passing the request itself as the token:

```ts
// inside a handler — server captured at startup (or via a service)
server.lugasLifecycle.track(sendWelcomeEmail(userId), ctx.request);
```

The uncorrelated `track(task)` form still drains at shutdown; it just doesn't hold the telemetry end event. This is why spans built from these events never silently exclude background work the request started.

## The OpenTelemetry recipe

Span export is application-owned. The recipe maps the two events onto `@opentelemetry/api` (an application/dev dependency — never a Lugas dependency):

```ts
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("lugas");

const spans = new WeakMap<object, ReturnType<typeof tracer.startSpan>>();

export const telemetry = {
  onRequestStart(e) {
    const span = tracer.startSpan(`${e.method} ${e.route}`, { startTime: Date.now() });
    if (e.requestId !== undefined) span.setAttribute("request.id", e.requestId);
    spans.set(holderFor(e), span);
  },
  onRequestEnd(e) {
    const span = spans.get(holderFor(e));
    span?.setStatus({ code: e.status < 500 ? SpanStatusCode.OK : SpanStatusCode.ERROR });
    span?.setAttribute("http.status_code", e.status);
    if (e.errorClass !== undefined) span.setAttribute("lugas.error_class", e.errorClass);
    span?.end(Date.now());
  },
};
```

Wire `holderFor` to carry the span handle between the two callbacks for one request (a `WeakMap` keyed by a per-request token your app mints, or an id-keyed `Map` with cleanup). With this, your existing sampler, exporter, and propagation apply unchanged — Lugas never touches them.

Deliberately absent (ADR-0032 non-goals): bundled exporters/agents, W3C `traceparent` propagation (read it in a guard when you need it — propagation policy is yours), metrics histograms (reduce the events yourself), and implicit `AsyncLocalStorage` correlation.

## Where next

- [Logging](./logging.md) — the access log and request-id facility telemetry composes with.
- [Services](./services.md) — the drain boundary that defines request-end.
- [Diagnostics](./diagnostics.md) — `LUGAS_TELEMETRY_001`.
