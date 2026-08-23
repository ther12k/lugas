---
type: Test Fixture
title: Manifest v1 — Canonical Expected Outputs
status: frozen
tags:
- manifest
- fixture
- m4
---

# Manifest v1 canonical fixtures

These pairs are the executable acceptance targets for M4-002. Each block
shows the app definition (left conceptually) and the exact manifest JSON the
capture step must produce (ordering and key order included). `frameworkVersion`
and `bunCompatibility` are represented by placeholders `<lugas-version>` /
`<bun-version>`; implementations substitute real values at generation time.

## Fixture A — Lugas routes with module, schemas, guards

App:

```ts
const auth = guard({ name: "auth", handler: () => json(401, { error: "x" }) });
const tenant = guard({ name: "tenant", handler: () => json(403, { error: "y" }) });

export default defineApp({
  modules: [
    defineModule({
      name: "billing",
      routes: {
        "/invoices/:id": {
          GET: route({
            params: z.object({ id: z.string() }),
            query: z.object({ format: z.string().optional() }),
            handler: () => json(200, { ok: true }),
          }),
          DELETE: route({
            params: z.object({ id: z.string() }),
            before: [auth],
            handler: () => new Response(null, { status: 204 }),
          }),
        },
      },
    }),
  ],
  routes: {
    "/users": {
      POST: route({
        headers: z.object({ authorization: z.string() }),
        body: z.object({ name: z.string(), tags: z.array(z.string()).optional() }),
        before: [auth, tenant],
        handler: () => json(201, { created: true }),
      }),
      GET: route({ handler: () => text(200, "list") }),
    },
    "/health": { GET: new Response("ok") },
  },
});
```

Expected manifest:

```json
{
  "format": "lugas-manifest-v1",
  "frameworkVersion": "<lugas-version>",
  "bunCompatibility": "<bun-version>",
  "modules": [
    { "name": "billing", "routes": ["/invoices/:id"] }
  ],
  "routes": [
    { "method": "GET", "path": "/health", "module": null, "kind": "native", "validates": [], "guards": [] },
    { "method": "GET", "path": "/invoices/:id", "module": "billing", "kind": "lugas", "validates": ["params", "query"], "guards": [] },
    { "method": "GET", "path": "/users", "module": null, "kind": "lugas", "validates": [], "guards": [] },
    { "method": "POST", "path": "/users", "module": null, "kind": "lugas", "validates": ["headers", "body"], "guards": ["auth", "tenant"] },
    { "method": "DELETE", "path": "/invoices/:id", "module": "billing", "kind": "lugas", "validates": ["params"], "guards": ["auth"] }
  ]
}
```

## Fixture B — native responses and mixed kinds only

App:

```ts
export default defineApp({
  routes: {
    "/a": { GET: new Response("a") },
    "/b": { POST: new Response(null, { status: 202 }) },
    "/c": { GET: route({ handler: () => empty(204) }) },
  },
});
```

Expected manifest:

```json
{
  "format": "lugas-manifest-v1",
  "frameworkVersion": "<lugas-version>",
  "bunCompatibility": "<bun-version>",
  "modules": [],
  "routes": [
    { "method": "GET", "path": "/a", "module": null, "kind": "native", "validates": [], "guards": [] },
    { "method": "POST", "path": "/b", "module": null, "kind": "native", "validates": [], "guards": [] },
    { "method": "GET", "path": "/c", "module": null, "kind": "lugas", "validates": [], "guards": [] }
  ]
}
```

## Ordering rules exercised by these fixtures

- `/health` precedes `/invoices/:id` and `/users` (code-unit path sort).
- Within `/users`: GET before POST (method code-unit sort).
- `/invoices/:id` rows keep module attribution while sorting globally.
- `validates` is always in canonical order (`params, query, headers, body`);
  `guards` preserves declaration order.
