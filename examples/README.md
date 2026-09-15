# Lugas examples

## Start here

Pick by goal, not by inventory order:

| Your goal | Go to |
|---|---|
| "I want my first working API." | [`basic`](./basic/) — one file, typed JSON and params; every example below it assumes nothing more |
| "I want a complete React application, feature by feature." | [`spa-starter`](./spa-starter/) — the canonical full-stack onboarding example; its README walks one task-list feature from schema to UI |
| "I need services, uploads, streaming, sessions, and the rest of the backend surface." | [`realworld`](./realworld/) — the deeper reference composing every shipped capability |
| "I want to understand raw TypeScript versus compiled Lugas." | [Distribution modes](#distribution-modes-raw-typescript-by-default) below, then `spa-starter`'s `start:raw` / `start:dist` |

## The catalog

Each example teaches exactly one concept using only public exports. Run any server example with `bun run <file>` and exercise it with the `curl` commands in its README. All of them run from the repository source (`bun install` at the repo root first) — **except `spa-starter`**, which installs a locally packed candidate (`file:lugas-starter.tgz`, refreshed from your checkout by its `bun run setup`) so packaging and consumer-type failures surface there. No example installs the npm package; the published beta is not exercised here.

| Example | Demonstrates | Run |
|---|---|---|
| [`basic`](./basic/) | Minimal app: typed JSON, params, text, redirect, Problem Details | `bun run examples/basic/server.ts` |
| [`validation`](./validation/) | Standard Schema (Zod + Valibot) across params, query, headers, body | `bun run examples/validation/server.ts` |
| [`auth`](./auth/) | Ordered guards: 401/403 short-circuits, context enrichment chaining | `bun run examples/auth/server.ts` |
| [`client`](./client/) | Typed client round-trip (success, guard, empty, not-found, redacted 500) | `bun examples/client/smoke.ts` |
| [`proof-api`](./proof-api/) | Realistic CRUD API combining validation, guards, and error statuses | `bun run examples/proof-api/app.ts` |
| [`realworld`](./realworld/) | **Every shipped capability composed**: Drizzle, validation, cookie sessions, SSE, WebSocket presence, uploads, logging, health, OpenAPI+Scalar, typed client | `bun run examples/realworld/server.ts` |
| [`cookies`](./cookies/) | Cookie primitives: set/read/expire a session cookie through a guard (`parseCookies`/`cookie`) | `bun run examples/cookies/server.ts` |
| [`uploads`](./uploads/) | Bounded multipart uploads: `form()` limits and 413 paths | `bun run examples/uploads/server.ts` |
| [`compression`](./compression/) | gzip negotiation (3.5KB → ~100B) and If-None-Match 304 | `bun run examples/compression/server.ts` |
| [`rate-limit`](./rate-limit/) | 429 with `Retry-After`/`RateLimit-*` over an application-owned store; per-key buckets | `bun run examples/rate-limit/server.ts` |
| [`telemetry`](./telemetry/) | Request events via telemetry callbacks; errorClass on a redacted 500 | `bun run examples/telemetry/server.ts` |
| [`production`](./production/) | Secure-header policy and lifecycle-aware `/health` + `/ready` endpoints | `bun run examples/production/server.ts` |
| [`websockets`](./websockets/) | WebSocket routes: guard-gated upgrade, echo context, close-1001 shutdown | `bun run examples/websockets/server.ts` |
| [`drizzle`](./drizzle/) | Application-owned Drizzle instance as a service (`lugas/drizzle`) | `bun run examples/drizzle/server.ts` |
| [`spa-starter`](./spa-starter/) | **Vite + React + API in one production process** (ADR-0037): guided task-list feature (schema → service → AppContract → typed client → UI states), then typed client, validated mutations, cookie auth, typed multipart upload, SSE, hashed-asset caching, SPA navigation fallback — against the installed package | `cd examples/spa-starter && bun run verify` |

### Prerequisites and expected results

- Repo-source examples (everything except `spa-starter`): `bun install` at the repo root, then the run command from the table; each example's README lists its `curl` checks. Expected result is the responses those commands print.
- `spa-starter`: needs the repo root installed too (its `setup` packs the checkout), then `bun run verify` inside `examples/spa-starter/` — expected result: the build completes, `24` starter tests pass, and `MODES-PARITY-OK` prints. To browse it, `bun run start:built` → http://localhost:3000.
- `spa-starter`'s package identity is a **locally packed candidate** (`lugas@0.0.0-starter`), refreshed from whatever your checkout contains — it is not the npm package, and no example here claims otherwise.

## Distribution modes: raw TypeScript by default

Lugas runs from TypeScript source by default on Bun and provides an optional pre-transpiled JavaScript distribution. Both expose the same API. Startup and resource differences depend on the application, runtime, cache conditions, and deployment method; the compiled option is not advertised as a faster request-processing mode.

You can see both modes against the same installed package in `spa-starter`, using the same unbundled server entry:

```bash
cd examples/spa-starter
bun run setup && bun run build      # installs the packed candidate + builds the frontend
bun run start:raw                   # bun server/main.ts                          → installed lugas TypeScript source
bun run start:dist                  # bun --conditions=lugas-dist server/main.ts  → installed lugas emitted JavaScript
bun run verify:modes                # proves both modes answer identically (same package version, same responses)
```

Two accuracy notes. The `lugas-dist` condition comes from the dual-distribution package exports in this repository — the locally packed candidate carries it; the published `0.1.0-beta.5` npm package predates it. And this is a compatibility demonstration, not a benchmark: `verify:modes` compares responses and version identity only. Production bundling (`start:built`) is a separate path — bundling resolves Lugas imports at build time, so a runtime condition no longer selects anything there.

## Test coverage

The client example runs as a self-contained smoke check that prints `EXAMPLE-SMOKE-OK` on success and is covered by `bun test tests/integration/server-client/`.

`proof-api` and `realworld` are exercised end-to-end by `bun test tests/integration/proof-api.test.ts` and `bun test tests/integration/realworld.test.ts`; `realworld` also ships a typed-client smoke (`bun run examples/realworld/client.ts` → `REALWORLD-CLIENT-OK`). `spa-starter` carries its own suite (`cd examples/spa-starter && bun test`), including the guided task-list walkthrough and distribution-mode parity.