---
name: lugas
description: Bun-native HTTP framework with typed contract, Standard Schema validation, ordered guards, and discriminated client results.
---

# Lugas Framework Skill

## When to use this skill

Use when creating HTTP servers, REST APIs, or type-safe clients on Bun.
Lugas provides compile-time path restrictions, schema-derived context types,
and runtime manifest truth.

## Task recipes

### Add a new route

1. Open your app definition file (where `defineApp()` is called).
2. Add an entry under `routes` with an uppercase HTTP method key.
3. Use `route({...})` with optional schemas and required `handler`.
4. The handler receives derived context types automatically.

### Add validation

1. Pass a Standard Schema (zod/valibot) to any of `params/query/headers/body`.
2. Schema outputs appear as typed properties on the handler context.
3. Transformed params (e.g. `z.coerce.number()`) arrive as their transformed type.

### Add authentication

1. Create guards with `guard({ name, handler })`.
2. Return a Response (`json(401, ...)`) to short-circuit.
3. Return an object to pass through and merge enrichment into context.
4. List guards in execution order via `before: [authGuard]`.

### Write a test

1. Import `createTestServer` from `lugas/testing`.
2. Call `createTestServer(app)` — returns ephemeral server with typed `.client`.
3. Use `.client.get()/post()/...` for typed calls or `.fetch()` for raw requests.
4. Always call `ts.stop()` in a finally block.

### Inspect routes

1. Run `bun run src/cli/main.ts routes ./src/app.ts` for human-readable table.
2. Run `bun run src/cli/main.ts inspect ./src/app.ts` for JSON manifest.

### Run tests

```bash
bun run verify          # full gate: typecheck + test + docs + diff
bun test                # all tests
bun test tests/unit/    # unit only
```

## Prohibited patterns

- Never use `Proxy` for routing or dispatch.
- Never import server modules in client code.
- Never use `any` at public API boundaries.
- Never return non-Response values from handlers (use `json()`, `text()`, etc.).

## Error codes

All framework diagnostics carry stable codes starting with `LUGAS_`.
See `docs/diagnostics.md` for the complete catalog.

## Key files to reference

- `docs/examples.md` — links to runnable examples
- `docs/client-error-semantics.md` — error/redaction policy
- `examples/basic/` — minimal app
- `examples/validation/` — schema usage
- `examples/auth/` — guards with enrichment
- `tests/conformance/` — cross-component invariant suite
