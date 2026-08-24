---
type: Reference
title: Canonical Examples
status: current
---

# Lugas Examples

Each example teaches exactly one concept using only public exports.

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
`createTestServer()` + `createClient<API>()`.

```bash
bun test tests/integration/server-client/
```
