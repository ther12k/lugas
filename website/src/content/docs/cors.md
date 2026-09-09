---
title: "CORS"
description: "Opt-in, fail-closed cross-origin resource sharing."
---
Lugas ships an app-level, opt-in CORS policy. The safe default is **no
cross-origin access**: an app without a `cors` key sends no CORS headers and
behaves byte-identically to pre-M8 releases. When configured, the policy is
enforced at the compile boundary — every compiled handler and the serve-time
fallback are wrapped once during `defineApp()` — so Bun's native router
([ADR-0004](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0004-bun-native-router-authoritative.md)) stays the
request-path router and no routes are synthesized.

```ts
import { defineApp, json, route } from "lugas";

defineApp({
  cors: {
    origin: "https://app.example.com", // exact string, allowlist, "*", or callback
    methods: ["GET", "POST"],          // optional; see defaults below
    allowedHeaders: ["Content-Type"],  // optional; default reflects the request
    exposedHeaders: ["X-Request-Id"],  // optional
    credentials: true,                 // optional; never with "*"
    maxAge: 600,                       // optional preflight cache (seconds)
  },
  routes: {
    "/api/items": {
      GET: route({ handler: () => json(200, { items: [] }) }),
      POST: route({ body: itemSchema, handler: (ctx) => json(201, ctx.body) }),
    },
  },
});
```

## Origin decisions (fail-closed)

`origin` accepts:

- an **exact origin string** (`"https://app.example.com"`) — echoed when the
  request's `Origin` matches exactly (scheme + host + port);
- an **allowlist array** of such strings — `"*"` cannot be mixed with
  concrete origins (`LUGAS_CORS_002`);
- the **wildcard `"*"`** — sends `Access-Control-Allow-Origin: *`; never
  combinable with `credentials: true` (`LUGAS_CORS_003`);
- a **callback** `(origin, request) => boolean | string`, sync or async:
  `true` echoes the request origin, a non-empty string echoes that canonical
  origin, `false` (or an empty/`"*"`-under-credentials result) denies.

Denied requests — and requests without an `Origin` header — receive **no**
`Access-Control-*` headers. They are not blocked: the response keeps its
normal status; the browser enforces the denial.

## What configured apps guarantee

- **`Vary: Origin` on every response** — merged with any handler-set `Vary`,
  never duplicated — including denies, errors (`onError` 500), not-found
  404s, and startup-gate 503s, so shared caches cannot serve one origin's
  authorization to another.
- **Preflight interception:** `OPTIONS` requests carrying
  `Access-Control-Request-Method` are answered `204` before application
  handlers — including paths with no declared `OPTIONS` entry (they reach the
  wrapped fallback through Bun's own routing). Allowed preflights get the
  full header set; denied ones get `204` with `Vary` only, so the browser
  fails them. Plain `OPTIONS` (no preflight marker) passes through to
  application handlers with headers applied.
- **Defaults:** `methods` defaults to `GET, HEAD, POST, PUT, PATCH, DELETE`
  (`OPTIONS` is implied by the mechanism); `allowedHeaders` defaults to
  reflecting `Access-Control-Request-Headers`. When configured, both gate
  strictly; a preflight approving a method the route then 404s is possible —
  authorization is unaffected, only preflight precision (see ADR-0022).
- **Coverage:** Lugas `route()` descriptors, native function handlers
  (path-level and per-method), any-method entries, modules, the not-found
  fallback, and a user-supplied `serve({ fetch })` all enforce the same
  policy.

## Scope boundary: pipeline-bypass values (fail-closed)

Static route values bypass the framework response pipeline — their bodies
cannot be re-wrapped without losing native serving semantics. Configuring
`cors` alongside them is rejected at startup (`LUGAS_CORS_004`):

- static `Response` values and `Bun.file()`/`Blob` values in any route
  position;
- native `{ dir }` mounts;
- `assets` configuration ([ADR-0018](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0018-opt-in-public-asset-serving.md)).

Convert such routes to handlers, or serve static content from a separate app
without `cors`. The rejection is deliberate and reversible; silently partial
enforcement is not.

## Manifest

`lugas-manifest-v1` records routing, not policy: CORS adds no routes and
changes no manifest facts.

## Evidence

Behavior and diagnostics are pinned by `tests/cors/cors.test.ts` and
`tests/cors/config.test.ts`; implementation evidence lives in
`docs/reports/issues/M8-001.md`.
