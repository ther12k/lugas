# Lugas examples

Each example teaches exactly one concept using only public exports. Run any server example with `bun run <file>` and exercise it with the `curl` commands in its README.

| Example | Demonstrates | Run |
|---|---|---|
| [`basic`](./basic/) | Minimal app: typed JSON, params, text, redirect, Problem Details | `bun run examples/basic/server.ts` |
| [`validation`](./validation/) | Standard Schema (Zod + Valibot) across params, query, headers, body | `bun run examples/validation/server.ts` |
| [`auth`](./auth/) | Ordered guards: 401/403 short-circuits, context enrichment chaining | `bun run examples/auth/server.ts` |
| [`client`](./client/) | Typed client round-trip (success, guard, empty, not-found, redacted 500) | `bun examples/client/smoke.ts` |
| [`proof-api`](./proof-api/) | Realistic CRUD API combining validation, guards, and error statuses | `bun run examples/proof-api/app.ts` |
| [`cookies`](./cookies/) | Cookie primitives: set/read/expire a session cookie through a guard (`parseCookies`/`cookie`) | `bun run examples/cookies/server.ts` |
| [`uploads`](./uploads/) | Bounded multipart uploads: `form()` limits and 413 paths | `bun run examples/uploads/server.ts` |
| [`compression`](./compression/) | gzip negotiation (3.5KB → ~100B) and If-None-Match 304 | `bun run examples/compression/server.ts` |
| [`telemetry`](./telemetry/) | Request events via telemetry callbacks; errorClass on a redacted 500 | `bun run examples/telemetry/server.ts` |
| [`production`](./production/) | Secure-header policy and lifecycle-aware `/health` + `/ready` endpoints | `bun run examples/production/server.ts` |
| [`websockets`](./websockets/) | WebSocket routes: guard-gated upgrade, echo context, close-1001 shutdown | `bun run examples/websockets/server.ts` |
| [`drizzle`](./drizzle/) | Application-owned Drizzle instance as a service (`lugas/drizzle`) | `bun run examples/drizzle/server.ts` |

The client example runs as a self-contained smoke check that prints `EXAMPLE-SMOKE-OK` on success and is covered by `bun test tests/integration/server-client/`.

`proof-api` is additionally exercised end-to-end by `bun test tests/integration/proof-api.test.ts`.
