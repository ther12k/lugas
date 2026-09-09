---
title: "OpenAPI and Scalar"
description: "Generated OpenAPI 3.1 documents with an opt-in Scalar reference UI."
---
Lugas provides **generation-first OpenAPI 3.1** specification generation and an
optional, zero-dependency **Scalar API Reference** UI presentation layer.

API contracts are derived directly from the single source of truth:
1. Prepared routing graph facts (paths, HTTP methods, module tags).
2. Standard Schema v1 validation declarations (`params`, `query`, `headers`, `body`), with automatic feature-detection for Standard JSON Schema (`~standard.jsonSchema`).
3. Optional route-level OpenAPI metadata on `route({ openapi })`.
4. Standard RFC 9457 Problem Details error component.

```ts
import { defineApp, route, json } from "lugas";

const app = defineApp({
  openapi: {
    document: {
      title: "Store API",
      version: "1.0.0",
      description: "E-commerce product catalog and orders",
    },
    path: "/openapi.json",    // default: "/openapi.json"
    ui: {
      path: "/docs",          // default: "/docs" (or `ui: true`)
    },
  },
  routes: {
    "/products/:id": {
      GET: route({
        openapi: {
          summary: "Get product details",
          tags: ["Products"],
        },
        handler: (ctx) => json(200, { id: ctx.params.id }),
      }),
    },
  },
});
```

## Route Metadata (`route({ openapi })`)

Individual routes can define metadata consumed exclusively by OpenAPI generation:

```ts
route({
  openapi: {
    operationId: "findProduct",
    summary: "Look up a single product",
    description: "Detailed description of product lookup",
    tags: ["Catalog"],
    deprecated: false,
    responses: {
      200: { description: "Product found" },
      404: { description: "Product not found" },
    },
  },
  handler: (ctx) => json(200, {}),
});
```

## Standard Schema Feature Detection vs Presence-Only Fallback

- **Standard JSON Schema:** If a validator exposes a `jsonSchema()` method via
  its `~standard` interface, Lugas extracts the exact JSON Schema for parameters
  and request bodies automatically.
- **Presence-Only Fallback:** If a validator does not expose JSON Schema
  introspection, Lugas documents parameter presence and requiredness based on
  its declared position (e.g. `query`, `body`), but **never invents or guesses
  types**.

## Scalar UI Shell

When `ui` is enabled, Lugas serves an HTML shell at `ui.path` (default `/docs`)
that embeds the `@scalar/api-reference` CDN script pointing at `openapi.path`.
This guarantees **zero new npm dependencies** in your application while
providing a rich, modern API reference explorer.

Both endpoints are framework-compiled handlers: they participate in CORS,
logging, and lifecycle exactly like any API route.
