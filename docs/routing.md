---
type: Guide
title: Routing and Handlers
status: current
tags:
- guide
- routing
- handlers
---

# Routing and handlers

Routes in Lugas are declared as a plain object keyed by **full path**, with one entry per HTTP method. There is no prefix magic, no registration order, and no middleware chain — the route map you write is the route map Bun serves, wrapped in the compiled validation/guard/error pipeline.

## The route map

```ts
import { defineApp, json, route } from "lugas";

export default defineApp({
  routes: {
    "/ping": {
      GET: route({ handler: () => json(200, { pong: true }) }),
    },
    "/users/:id": {
      GET: route({ handler: (ctx) => json(200, { id: ctx.params.id }) }),
      PATCH: route({ /* … */ }),
      DELETE: route({ /* … */ }),
    },
  },
});
```

Every path starts with `/`. Method keys are the seven HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`). Each `method + path` pair may be declared once — a duplicate inside a module fails at `defineModule()` (`LUGAS_MODULE_005`), and the same path claimed by both `routes` and a module fails at composition.

## Path syntax

Paths are validated at declaration time with one canonical rule set (`LUGAS_ROUTES_004` on violation):

- Param tokens are `:name` segments; the name must match `[A-Za-z0-9_]+`, and each name may appear at most once per path.
- A wildcard `*` is allowed **only as the final segment** (`"/files/*"`).
- Segments containing `*` in any other position, or malformed param tokens, are rejected before startup.

Params arrive on `ctx.params` as strings (Bun's wire truth). Declaring a `params` schema transforms and retypes them — see [validation](./validation.md).

## `route()` options

`route()` builds a frozen, immutable descriptor. Invariants are checked at creation so misconfiguration fails at startup, never per request. Unknown keys are rejected (`LUGAS_ROUTE_002`) — typos cannot pass silently.

| Option | Type | Purpose |
|---|---|---|
| `handler` | `(ctx) => Response \| Promise<Response>` | **Required.** Receives the validated context; returns a typed response helper result or any `Response`. |
| `before` | `GuardDescriptor[]` | Ordered guards. See [guards](./guards.md). |
| `params` | Standard Schema | Validates/transforms path params. |
| `query` | Standard Schema | Validates the query string into a typed object. |
| `headers` | Standard Schema | Validates request headers (lowercase names). |
| `body` | Standard Schema | Declares a framework-parsed JSON body; enables the body budget. |
| `budget` | `number` | Per-route body budget in bytes (requires `body`). |
| `openapi` | `OpenApiRouteMetadata` | Documentation metadata (`summary`, `tags`, `responses`, …). |

Passing a non-object, a missing/invalid `handler`, or malformed `before` entries raises `LUGAS_ROUTE_001` through `LUGAS_ROUTE_005` respectively — all before the server starts.

## Modules

`defineModule()` is a **named bag of full-path routes** (ADR-0015). Modules carry no path prefix, no lifecycle scope, and no private service registry — they exist so feature areas can be composed and read as units, and so manifests can attribute routes to a named owner.

```ts
import { defineModule, route, json } from "lugas";

const invoices = defineModule({
  name: "invoices",
  routes: {
    "/invoices": {
      POST: route({ /* … */ }),
    },
    "/invoices/:id": {
      GET: route({ /* … */ }),
    },
  },
});

export default defineApp({
  modules: [invoices],
});
```

Rules:

- `name` must be a non-empty, unique string within the app (`LUGAS_APP_005` on duplicates); it appears in the [manifest](./manifest-v1.md).
- Paths are full paths, validated with the same rule set as app-level routes.
- Modules accept the same route-map values as the app: `route()` descriptors **and** native Bun values.

## Native route values

Not every entry needs the pipeline. Route-map values are preserved exactly as declared, so anything `Bun.serve` accepts works directly:

```ts
import { Bun } from "bun";

export default defineApp({
  routes: {
    "/health": {
      GET: () => new Response("ok"),                 // plain handler fn
    },
    "/favicon.ico": {
      GET: new Response(/* prebuilt */),             // static Response
    },
    "/logo.png": {
      GET: Bun.file("./static/logo.png"),            // BunFile
    },
    "/static/*": {
      GET: { dir: "./static" },                      // native directory mount
    },
  },
});
```

These pipeline-bypass kinds skip guards, validation, CORS wrapping, logging, and lifecycle gating — they are Bun's behavior, verbatim. Note that configuring `cors` rejects these route kinds at startup (`LUGAS_CORS_004`): an app with a CORS policy must not also serve un-wrapped origins. Prefer [`assets`](./getting-started.md#serving-public-assets) for static files — it adds ownership validation and startup checks.

## The handler context

The handler context is **computed from the route descriptor** — never manually annotated:

```ts
route({
  params: z.object({ id: z.coerce.number() }),
  query: z.object({ expand: z.string().optional() }),
  before: [authGuard],
  handler: (ctx) => {
    ctx.request;   // native Request
    ctx.services;  // the app's services object (typed via route<Services>)
    ctx.params;    // { id: number }        — validator OUTPUT (transformed)
    ctx.query;     // { expand?: string }   — validator output; optional-undefined when undeclared
    ctx.headers;   // validator output when declared; optional-undefined otherwise
    ctx.body;      // validator output when declared; optional-undefined otherwise
    ctx.user;      // guard enrichment, typed from authGuard's return
  },
})
```

- Declared slots carry the validator's **output** type and are always present after validation.
- Undeclared slots are typed `| undefined` so accidental reads stay visible.
- Guard enrichments intersect in declaration order; two guards claiming the same key with different types collapse to `never` at compile time (the runtime rejects the collision outright).

To type `ctx.services`, name the services shape as `route()`'s first generic — usually inferred from `defineApp({ services })` when routes are declared inside the app config. See [services](./services.md).

## Inspecting the composed graph

The routing graph is frozen at `defineApp()` time. Read it without starting a server:

```bash
bunx lugas routes ./app.ts    # human-readable route table
bunx lugas inspect ./app.ts   # full lugas-manifest-v1 JSON
```

Or in-process: `app.manifest` is the frozen `lugas-manifest-v1` document. See [manifest-v1](./manifest-v1.md).

## Where next

- [Validation](./validation.md) — the four schema slots and the `422` failure contract.
- [Guards](./guards.md) — ordered guards and typed context enrichment.
- [Responses](./responses.md) — typed response helpers and the error policy.
