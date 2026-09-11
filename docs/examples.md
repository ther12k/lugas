---
type: Reference
title: Canonical Examples
status: current
---

# Lugas Examples

Each example teaches exactly one concept using only public exports. The
GitHub-facing index lives at [`examples/README.md`](../examples/README.md).

## Basic — defineApp + route + serve

`examples/basic/` shows a minimal app with two routes and no validation.

```bash
bun run examples/basic/server.ts
curl http://localhost:3000/hello
```

## Validation — zod schemas on params/query/headers/body

`examples/validation/` demonstrates Standard Schema validators on all four
slots, showing transformed params and validated outputs in the handler
context.

```bash
bun run examples/validation/server.ts
```

## Auth — guards with short-circuit and enrichment

`examples/auth/` shows ordered guards returning 401/403 short-circuits or
enrichment objects that appear in the handler context type.

```bash
bun run examples/auth/server.ts
```

## Client — typed client over the test server helper

`examples/client/` proves the full server↔client round-trip using
`createTestServer()` + `createClient<API>()`. The smoke script prints
`EXAMPLE-SMOKE-OK` on success.

```bash
bun examples/client/smoke.ts
# or as a test suite:
bun test tests/integration/server-client/
```

## Proof API — realistic CRUD composition

`examples/proof-api/` combines the above in one in-memory API: CRUD
operations, validation on params/headers/body, ordered guards (auth 401 →
admin 403), 404/409/422 error statuses, 204 No Content, and a slow route for
abort testing.

```bash
bun run examples/proof-api/app.ts
bun test tests/integration/proof-api.test.ts
```

## Realworld — every shipped capability composed

`examples/realworld/` is the opposite of the single-concept examples: one
application combining Drizzle (Bun SQLite), validation on all four slots,
cookie sessions behind guards, SSE notifications, WebSocket presence,
bounded multipart uploads, structured logging, health/readiness, secure
headers, OpenAPI + Scalar, and the typed client — using only public exports
as documented. The friction found building it is recorded in
[`docs/reports/dogfood-realworld-findings.md`](reports/dogfood-realworld-findings.md).

```bash
bun run examples/realworld/server.ts
bun run examples/realworld/client.ts   # REALWORLD-CLIENT-OK
bun test tests/integration/realworld.test.ts
```
