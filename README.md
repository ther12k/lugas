<div align="center">
  <img src="https://raw.githubusercontent.com/ther12k/lugas/main/docs/assets/lugas-logo.svg" alt="Lugas logo" width="112" />
  <h1>LugasJS</h1>
  <p><strong>Explicit, Bun-native typed HTTP APIs — without runtime proxies, code generation, or production dependencies.</strong></p>
  <p>
    <a href="./docs/getting-started.md">Getting started</a> ·
    <a href="./examples">Examples</a> ·
    <a href="./docs/compatibility.md">Compatibility</a> ·
    <a href="./docs/roadmap.md">Roadmap</a>
  </p>
  <p>
    <a href="https://github.com/ther12k/lugas/actions/workflows/ci.yml"><img src="https://github.com/ther12k/lugas/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <img src="https://img.shields.io/badge/channel-beta-orange" alt="Release channel: beta" />
    <img src="https://img.shields.io/badge/bun-1.4.x-f472b6" alt="Bun 1.4.x" />
    <img src="https://img.shields.io/badge/TypeScript-7.0.x-3178c6?logo=typescript&logoColor=white" alt="TypeScript 7.0.x" />
    <img src="https://img.shields.io/badge/runtime%20dependencies-0-brightgreen" alt="Zero runtime dependencies" />
    <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License: Apache-2.0" />
  </p>
</div>

## Status and install

Lugas uses the `beta` dist-tag for prerelease builds. Check [npm](https://www.npmjs.com/package/lugas) or [GitHub Releases](https://github.com/ther12k/lugas/releases) for the currently available version.

For published beta builds:

```bash
bun add lugas@beta
```

Requires [Bun](https://bun.sh) 1.4.x; TypeScript 7.0.2 is the verified toolchain for the full compile-time contract experience.

## 30-second example

```ts
// app.ts
import { defineApp, json, route } from "lugas";

const app = defineApp({
  routes: {
    "/hello": {
      GET: route({
        handler: () => json(200, { message: "Hello from Lugas" }),
      }),
    },
  },
});

export default app;
```

```ts
// server.ts
import app from "./app";

const server = app.serve({ port: 3000 });
console.log(`Lugas is listening on ${server.url}`);
```

```bash
bun run server.ts
curl http://localhost:3000/hello
```

Routes stay ordinary HTTP: native `Request`, explicit statuses, real `fetch` underneath.

Validation and guards compose per route; schema outputs and guard enrichments arrive typed on the handler context:

```ts
import { defineApp, defineModule, guard, json, route } from "lugas";
import { z } from "zod"; // any Standard Schema v1 validator works

const auth = guard({
  name: "auth",
  handler: (ctx) => {
    if (!ctx.request.headers.get("authorization")) return json(401, { error: "unauthorized" });
    return { user: { id: "u_1" } };
  },
});

export default defineApp({
  modules: [
    defineModule({
      name: "invoices",
      routes: {
        "/invoices": {
          POST: route({
            before: [auth],
            body: z.object({ amount: z.number().positive(), currency: z.string().length(3) }),
            handler: (ctx) => json(201, { id: "inv_1", amount: ctx.body.amount, user: ctx.user.id }),
          }),
        },
      },
    }),
  ],
});
```

## Why Lugas?

Most TypeScript frameworks sit at one of two extremes: a thin router that leaves all structure to you, or a large platform with decorators, proxies, and generated clients. Lugas takes a narrower path — **keep HTTP explicit, add only the structure that makes Bun applications predictable, typed, testable, and inspectable**:

- typed routes with status-discriminated, wire-honest response types;
- Standard Schema v1 validation (Zod, Valibot, …) with schema-derived handler types;
- ordered guards with typed context enrichment;
- RFC 9457 Problem Details errors with stable diagnostic codes;
- an end-to-end typed client — no code generation, no runtime `Proxy`;
- zero production runtime dependencies.

Full positioning and framework comparisons: [`docs/choosing-lugas.md`](docs/choosing-lugas.md).

## Typed client (`lugas/client`)

```ts
import type { AppContract } from "lugas";
import { createClient } from "lugas/client";
import type app from "./app";

const api = createClient<AppContract<typeof app>>({ baseUrl: "https://api.example.com" });

const result = await api.post("/invoices", {
  body: { amount: 125, currency: "USD" },
});

if (result.ok) {
  console.log(result.status, result.data.id);
} else {
  console.error(result.status, result.error); // Problem Details on 4xx/5xx
}
```

Types describe the wire. A handler returning `json(200, { createdAt: new Date() })` is observed by the client as `{ createdAt: string }` — non-finite numbers, `toJSON()` drops, and throws are all modeled, not hidden. Details: [`docs/wire-honest-types.md`](docs/wire-honest-types.md).

## Features

| Capability | Status |
|---|---|
| Bun-native server, typed routes, modules | Available |
| Standard Schema validation on params/query/headers/body | Available |
| Ordered guards with typed context enrichment | Available |
| Status-discriminated, wire-honest responses (`json`/`text`/`problem`/`empty`) | Available |
| RFC 9457 Problem Details + redacted 500s | Available |
| End-to-end typed client (`lugas/client`, browser-safe) | Available |
| Service lifecycle: init, drain-ordered shutdown, reverse disposal (`service()`) | Available |
| Test-server helpers (`lugas/testing`) | Available |
| Static route manifest + inspection CLI (`lugas-manifest-v1`) | Available |
| First-party CORS (`defineApp({ cors })`, opt-in, fail-closed) | Available in `0.1.0-beta.2` (M8-001) |
| Server-Sent Events (`sse()` helper, deterministic cleanup) | Available in `0.1.0-beta.2` (M8-002) |
| Structured logging (`defineApp({ logging })`, sink contract) | Available in `0.1.0-beta.2` (M8-003) |
| OpenAPI 3.1 + Scalar reference UI (`defineApp({ openapi })`, zero-dependency) | Available in `0.1.0-beta.2` (M8-004) |
| Drizzle ORM adapter (`lugas/drizzle`, application-owned instance) | Available in `0.1.0-beta.3` (M9-001) |
| Cookie primitives (`parseCookies`/`cookie`, RFC 6265, auth-interop recipe) | Available in `0.1.0-beta.4` (M9-002) |
| WebSockets (`websocket()` routes, pre-upgrade guards, shutdown close-1001) | Available in `0.1.0-beta.4` (M9-003) |
| Secure headers + health/readiness (`secureHeaders`, `health`) | Available in `0.1.0-beta.4` (M9-004) |
| Multipart uploads (`form()` body codec, budget-bounded) | Available in `0.1.0-beta.4` (M9-005) |
| Telemetry hooks (`onRequestStart`/`onRequestEnd`, OTel recipe) | Available in `0.1.0-beta.4` (M9-006) |
| Compression + ETag (`compression`, `etag`; native gzip/deflate, 304) | Available in `0.1.0-beta.4` (M9-007) |
| Rate limiting (`rateLimit()` guard, application-owned storage, 429 + Retry-After) | Available in `0.1.0-beta.4` (M9-008) |

## Examples

Runnable, single-concept applications under [`examples/`](examples/) — indexed in [`examples/README.md`](examples/README.md):

| Example | Demonstrates |
|---|---|
| [`basic`](examples/basic/) | Minimal app: routes, JSON/text, redirect, Problem Details |
| [`validation`](examples/validation/) | Zod + Valibot across params, query, headers, body |
| [`auth`](examples/auth/) | Ordered guards: 401/403 short-circuits, context enrichment |
| [`client`](examples/client/) | Typed client round-trip against a live test server |
| [`proof-api`](examples/proof-api/) | Realistic CRUD API combining all of the above |

## Compatibility

Verified matrix (see [`docs/compatibility.md`](docs/compatibility.md)): Bun **1.4.x** on Linux x86-64, macOS arm64, and Windows x64; TypeScript **7.0.2**; Zod **4.4.3** and Valibot **1.4.2** (any Standard Schema v1 validator works). Browser-safe client bundle plus a prebuilt browser artifact (`lugas/client/browser`) verified in a same-origin real-browser lane; real browsers are not part of the per-OS CI matrix.

Known beta limitations: the server core and CLI are Bun-only (the client bundle is runtime-neutral), declarations ship as direct `.ts` sources, and in-flight handler work is not cancelled on client disconnect.

## Roadmap

Shipped and planned work lives in [`docs/roadmap.md`](docs/roadmap.md). `lugas@0.1.0-beta.4` (cookies, WebSockets, secure headers/health, multipart, telemetry, compression/ETag, rate limiting; source commit `373418f`) and the Drizzle adapter ([`docs/drizzle.md`](docs/drizzle.md), `0.1.0-beta.3`) are published under npm `beta`; First-party CORS ([`docs/cors.md`](docs/cors.md)), Server-Sent Events ([`docs/sse.md`](docs/sse.md)), Structured Logging ([`docs/logging.md`](docs/logging.md)), and OpenAPI 3.1 + Scalar ([`docs/openapi.md`](docs/openapi.md)) ship in `0.1.0-beta.2`+; `latest` and `beta` both point at `0.1.0-beta.4`.

## Documentation

| Document | Contents |
|---|---|
| [`docs/getting-started.md`](docs/getting-started.md) | Install, first app, validation, guards, client, testing, CLI |
| [`docs/routing.md`](docs/routing.md) | Route maps, path syntax, modules, native values, the derived handler context |
| [`docs/validation.md`](docs/validation.md) | Standard Schema slots, coercion, body parsing, the `422` failure contract |
| [`docs/guards.md`](docs/guards.md) | Ordered guards, typed context enrichment, short-circuits, composition patterns |
| [`docs/responses.md`](docs/responses.md) | Typed response helpers, Problem Details, `notFound`/`onError`, redaction |
| [`docs/services.md`](docs/services.md) | Named dependencies, `service()` lifecycle, the init traffic gate, drain shutdown |
| [`docs/client.md`](docs/client.md) | The end-to-end typed client: calls, per-status results, error classes |
| [`docs/testing.md`](docs/testing.md) | `createTestServer`, the bound typed client, lifecycle and error-contract tests |
| [`docs/wire-honest-types.md`](docs/wire-honest-types.md) | How response types model JSON serialization truth |
| [`docs/design-principles.md`](docs/design-principles.md) | Explicit HTTP, no codegen, no proxies, zero forced ecosystem |
| [`docs/choosing-lugas.md`](docs/choosing-lugas.md) | Fit and comparison with raw Bun, Elysia, Hono, Fastify, tRPC |
| [`docs/api-reference.md`](docs/api-reference.md) | Public API reference |
| [`docs/diagnostics.md`](docs/diagnostics.md) | Diagnostic code catalog (`LUGAS_*`) |
| [`docs/manifest-v1.md`](docs/manifest-v1.md) | Frozen `lugas-manifest-v1` schema |
| [`docs/client-error-semantics.md`](docs/client-error-semantics.md) | Client error and redaction policy |
| [`docs/drizzle.md`](docs/drizzle.md) | Drizzle integration: application-owned instance as a service |
| [`docs/cookies.md`](docs/cookies.md) | Cookie primitives and the Better Auth interop recipe |
| [`docs/websockets.md`](docs/websockets.md) | WebSocket routes: pre-upgrade guards, native sockets, shutdown semantics |
| [`docs/production.md`](docs/production.md) | Production hardening: secure headers and health/readiness |
| [`docs/uploads.md`](docs/uploads.md) | Bounded multipart uploads: `form()` body codec |
| [`docs/telemetry.md`](docs/telemetry.md) | Dependency-free telemetry hooks and the OpenTelemetry recipe |
| [`docs/compression.md`](docs/compression.md) | Response compression (gzip/deflate) and ETag/304 conditional requests |
| [`docs/rate-limit.md`](docs/rate-limit.md) | Rate limiting: fixed-window guard semantics over application-owned storage |
| [`docs/ai-agents.md`](docs/ai-agents.md) | Agent-readable surfaces (manifest, OpenAPI), LLM streaming recipe, MCP proposal |
| [`docs/performance-gates.md`](docs/performance-gates.md) | Release performance budgets and evidence policy |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |
| [Release evidence](https://github.com/ther12k/lugas/blob/main/docs/releases/beta/RELEASE_PACKET.md) | Candidate evidence packet, provenance, and checksums (GitHub) |

Agent-facing context: [`llms.txt`](llms.txt) and [`llms-full.txt`](llms-full.txt). Governance, delivery history, and architecture decisions live under [`docs/okf/`](docs/okf/index.md); implementation evidence under [`docs/reports/`](docs/reports/).

## Contributing and security

Contributions follow the worktree + verify-gate workflow in [`CONTRIBUTING.md`](CONTRIBUTING.md) — real-application feedback, type-inference reproductions, and cross-platform reports are the highest-value contributions during beta. Community rules: [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Questions and support: [`SUPPORT.md`](SUPPORT.md).

Do **not** open public issues for security vulnerabilities — report privately per [`SECURITY.md`](SECURITY.md).

## License

Apache-2.0 — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
