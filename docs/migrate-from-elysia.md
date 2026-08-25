# Migrating from Elysia to Lugas

## Concept mapping

| Elysia | Lugas |
|---|---|
| `new Elysia()` | `defineApp()` |
| `.get(path, handler)` | `routes[path].GET = route({ handler })` |
| `.guard()` | `before: [guard()]` on individual routes |
| `t.Object({...})` | `z.object({...})` (Standard Schema) |
| `.derive()` | Guard enrichment objects |
| Treaty (client) | `createClient<API>()` |

## Features NOT available in Lugas

- WebSocket support
- Plugin system
- Global lifecycle hooks (onRequest/onError)
- Schema-based OpenAPI generation
- Server-side cookies API

## When to stay on Elysia

- You need WebSockets.
- You depend on Elysia's plugin ecosystem.
- You use OpenAPI code generation from schemas.

## Coexistence

Lugas and Elysia can coexist on different ports during migration. No shared state is required.
