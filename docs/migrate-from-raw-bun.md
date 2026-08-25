# Migrating from Raw Bun to Lugas

## Route definition

Raw Bun:
```ts
Bun.serve({
  routes: {
    "/users/:id": {
      GET: (req) => new Response(JSON.stringify({ id: req.params.id })),
    },
  },
});
```

Lugas:
```ts
import { defineApp, route, json } from "lugas";

const app = defineApp({
  routes: {
    "/users/:id": {
      GET: route({
        handler: ({ params }) => json(200, { id: params.id }),
      }),
    },
  },
});
```

## Validation

Raw Bun requires manual parsing. Lugas uses Standard Schema:

```ts
route({
  params: z.object({ id: z.coerce.number() }),
  handler: ({ params }) => json(200, { id: params.id }), // params.id is number
})
```

## Error handling

Raw Bun has no built-in error boundary. Lugas provides one with stable diagnostic codes.

## When to stay on raw Bun

- You need zero framework overhead.
- You have fewer than 10 routes.
- You rely on Bun-specific APIs not wrapped by Lugas.
