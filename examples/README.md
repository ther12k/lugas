# Lugas examples

Each example teaches exactly one concept using only public exports. Run any server example with `bun run <file>` and exercise it with the `curl` commands in its README.

| Example | Demonstrates | Run |
|---|---|---|
| [`basic`](./basic/) | Minimal app: typed JSON, params, text, redirect, Problem Details | `bun run examples/basic/server.ts` |
| [`validation`](./validation/) | Standard Schema (Zod + Valibot) across params, query, headers, body | `bun run examples/validation/server.ts` |
| [`auth`](./auth/) | Ordered guards: 401/403 short-circuits, context enrichment chaining | `bun run examples/auth/server.ts` |
| [`client`](./client/) | Typed client round-trip (success, guard, empty, not-found, redacted 500) | `bun examples/client/smoke.ts` |
| [`proof-api`](./proof-api/) | Realistic CRUD API combining validation, guards, and error statuses | `bun run examples/proof-api/app.ts` |

The client example runs as a self-contained smoke check that prints `EXAMPLE-SMOKE-OK` on success and is covered by `bun test tests/integration/server-client/`.

`proof-api` is additionally exercised end-to-end by `bun test tests/integration/proof-api.test.ts`.
