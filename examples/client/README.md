# Client example

Proves the full server↔client round trip using `createTestServer()` (from `lugas/testing`) plus `createClient<AppContract>()` (from `lugas/client`).

- `app.ts` — the shared contract application: a typed `/users/:id` route with params/query validation and a guard-protected `/guarded` route.
- `smoke.ts` — drives the app on an ephemeral port through success, guard short-circuit, empty response, not-found, and redacted-500 paths, printing `EXAMPLE-SMOKE-OK` on success.

## Run

```bash
bun examples/client/smoke.ts
```

## Test

```bash
bun test tests/integration/server-client/
```

The client is platform-neutral: no Bun globals, no `Proxy`, no generated SDK — explicit method calls and path strings over ordinary `fetch`.
