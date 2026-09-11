# Realworld reference app

The opposite of the single-concept examples: one application that **composes every shipped capability** using only public exports, exactly as documented. Built as a dogfood exercise for 0.1.0 stabilization — the friction found while building it is recorded in [`docs/reports/dogfood-realworld.md`](../../docs/reports/dogfood-realworld.md).

| Capability | Where |
|---|---|
| Drizzle + Bun SQLite as a service | `drizzleService({ db, closeOnDispose: true })`, SQL via `sql` templates |
| Validation (Standard Schema) | `params`/`query`/`headers`/`body` slots with Zod, coercion, defaults |
| Cookie sessions | `parseCookies`/`cookie` behind a `session` guard (401 short-circuit) |
| Problem Details errors | `problem(404/409/422)` for not-found, duplicate email, bad upload |
| SSE notifications | `sse()` stream fed by an in-process event bus, heartbeat + cleanup |
| WebSocket presence | `websocket()` route with a query-token guard and pub/sub rooms |
| Multipart upload | `form({ maxFiles, maxFileSize })` with native `File` values |
| Structured logging | access log + request IDs through the sink contract |
| Health/readiness | `health: true` mounting `/health` and `/ready` |
| Secure headers | `secureHeaders: true` conservative baseline |
| OpenAPI + Scalar | generated document at `/openapi.json`, UI at `/docs` (`ui: true`) |
| Typed client | `createClient<AppContract<App>>` driving the whole API (`client.ts`) |

## Run

```bash
bun run examples/realworld/server.ts
```

Then:

```bash
# public surface
curl -s localhost:3000/health
curl -s localhost:3000/users
curl -s localhost:3000/openapi.json      # generated contract
open localhost:3000/docs                 # Scalar UI

# sign in (cookie jar) and use the session
curl -sc /tmp/rw.jar -X POST localhost:3000/auth/login \
  -H 'content-type: application/json' -d '{"name":"ada"}'
curl -sb /tmp/rw.jar localhost:3000/me
curl -sb /tmp/rw.jar -N localhost:3000/events    # live SSE stream
```

The typed-client smoke exercises the API the way a browser would (cookie captured by hand — the client has no cookie jar, by design):

```bash
bun run examples/realworld/client.ts     # prints REALWORLD-CLIENT-OK
```

## Design notes

- **Sessions are demo-grade**: an in-memory `Map<token, userId>`. Real apps bring their own session store or Better Auth — see [`docs/cookies.md`](../../docs/cookies.md).
- **WebSocket auth uses a query token** (`/ws?session=…`) because the browser `WebSocket` API cannot set `Cookie` headers on the handshake; this mirrors the documented pattern in [`docs/websockets.md`](../../docs/websockets.md). Same session map, same lookup as the cookie guard.
- **`ws.publish` does not echo to the sender** (Bun pub/sub semantics) — presence messages go to everyone else in the room.
- **Mutations use `RETURNING` + `.all()`**: drizzle's bun-sqlite `.get()` returns a values-array rather than a row object, and `.run()` resolves `void` — `RETURNING` through `.all()` is the typed single-row path.
- The app is exercised end-to-end by `bun test tests/integration/realworld.test.ts`.
