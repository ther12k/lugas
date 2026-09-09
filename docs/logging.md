---
type: Reference
title: Structured Logging Contract and Access Facility
status: current
tags:
- logging
- observability
- m8
---

# Structured Logging and Access Facility (ADR-0024)

Lugas provides an app-level, opt-in structured logging contract and access log
facility. The core design is a **sink contract, not a logging product**: Lugas
does not vendor or bundle a logging library. Instead, the framework emits
structured, scalar-only entries to a pluggable sink function, making it trivial
to adapt to Pino, OpenTelemetry loggers, or any standard logging system.

```ts
import { defineApp, route, json } from "lugas";

defineApp({
  logging: {
    level: "info",      // "debug" | "info" | "warn" | "error" (default: "info")
    access: true,       // emit per-request access entry (default: false)
    requestIds: true,   // generate UUID, add x-request-id header, and log (default: false)
    sink: (entry) => {
      // Integration point for vendor loggers:
      // pino[entry.level](entry.fields, entry.message);
      console.log(JSON.stringify(entry));
    },
  },
  routes: {
    "/api/status": {
      GET: route({ handler: () => json(200, { ok: true }) }),
    },
  },
});
```

## Entry Contract and Redaction by Construction

Every framework log entry conforms to:

```ts
type LugasLogEntry = {
  time: string;       // ISO-8601 UTC timestamp
  level: "debug" | "info" | "warn" | "error";
  message: string;
  fields?: Record<string, string | number | boolean | null>;
};
```

**Redaction by Construction:** The framework's log schema is strictly closed
and allows only primitive scalar values. Lugas never logs request bodies,
query parameters, request/response headers (except the correlated
`requestId`), cookies, authorization tokens, or client IPs.

## Access Logging

When `access: true` is configured, Lugas emits an `info`-level entry for every
completed request:

| Field | Description | Example |
|---|---|---|
| `method` | HTTP method | `"GET"` |
| `path` | Request pathname | `"/users/123"` |
| `route` | Matched route pattern or `"-"` for unmatched/fallback | `"GET /users/:id"` |
| `status` | Response HTTP status code | `200` |
| `durationMs` | Request processing time in ms | `1.42` |
| `requestId` | Correlated request UUID (if `requestIds: true`) | `"550e8400-e29b-41d4-a716-446655440000"` |

Access logs cover:
- Standard `route()` handlers
- Native function handlers and method maps
- Held requests rejected with `503` due to lifecycle startup failures
- Unhandled exceptions resulting in redacted `500` Problem Details
- 404 Not Found and fallback requests

**CORS Preflight Exception:** CORS preflight requests (`OPTIONS` with
`Access-Control-Request-Method`) are handled at the outermost CORS boundary and
are intentionally not logged as application access requests.

## Request ID Correlation

When `requestIds: true` is enabled:
1. Lugas generates a `crypto.randomUUID()` for each incoming request.
2. The UUID is set as the `x-request-id` header on the outgoing response.
3. The UUID is included as `requestId` in the access log entry.
