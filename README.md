# LugasJS

**Lugas** is a small, explicit, Bun-native TypeScript framework for building typed HTTP APIs without hiding HTTP behind RPC, runtime proxies, code generation, or a large dependency graph.

It combines raw `Bun.serve` semantics with:

- typed routes and status-specific responses;
- Standard Schema validation;
- ordered guards with typed context enrichment;
- wire-honest JSON response types;
- RFC 9457 Problem Details;
- an explicit end-to-end typed client;
- testing and manifest-inspection tools;
- zero production runtime dependencies in the core.

> **Status:** attested `v0.1.0-beta.1` candidate; npm publication requires explicit owner authorization.
> **Runtime:** Bun 1.4.x
> **License:** Apache-2.0

## Why Lugas?

Most TypeScript frameworks optimize for one of two extremes:

1. a very thin router that leaves application structure to you; or
2. a large platform that introduces decorators, proxies, generated clients, framework-specific request objects, and substantial runtime machinery.

Lugas takes a narrower path:

> **Keep HTTP explicit. Add only the structure needed to make Bun applications predictable, typed, testable, and inspectable.**

A Lugas application still uses:

- native `Request`;
- native `Response`;
- visible HTTP methods and paths;
- explicit status codes;
- ordinary `fetch` transport;
- native Bun server behavior.

The framework adds contracts around those primitives rather than replacing them.

## Current beta surface

The beta includes:

| Capability | Status |
|---|---|
| Bun-native HTTP server | Available |
| Typed route declarations | Available |
| Root and module route composition | Available |
| Standard Schema validation | Available |
| Typed guards and context enrichment | Available |
| Status-discriminated responses | Available |
| RFC 9457 Problem Details | Available |
| End-to-end typed HTTP client | Available |
| Test-server helpers | Available |
| Static route manifest | Available |
| Route-inspection CLI | Available |
| OpenAPI and Scalar | Planned first-party integration |
| CORS middleware | Planned first-party integration |
| Server-Sent Events | Planned core helper |
| Structured request logging | Planned core facility |
| Drizzle ORM integration | Planned optional adapter |

## Install

After the beta package is published:

```bash
bun add lugas@beta
```

Lugas currently requires Bun 1.4.x. TypeScript 7.0.2 is the verified toolchain for the full compile-time contract experience.

## Hello world

Create an application:

```ts
// app.ts
import { defineApp, json, route } from "lugas";

const app = defineApp({
  routes: {
    "/hello": {
      GET: route({
        handler: () => {
          return json(200, {
            message: "Hello from Lugas",
          });
        },
      }),
    },
  },
});

export default app;
```

Start the server:

```ts
// server.ts
import app from "./app";

const server = app.serve({
  port: 3000,
});

console.log(`Lugas is listening on ${server.url}`);
```

Run it:

```bash
bun run server.ts
```

Then request the route:

```bash
curl http://localhost:3000/hello
```

## Validation and typed guards

Lugas accepts validators that implement Standard Schema v1.

```ts
import {
  defineApp,
  defineModule,
  guard,
  json,
  route,
} from "lugas";

import { z } from "zod";

const authGuard = guard({
  name: "auth",

  handler: (ctx) => {
    const authorization =
      ctx.request.headers.get("authorization");

    if (!authorization) {
      return json(401, {
        error: "unauthorized",
      });
    }

    return {
      user: {
        id: "usr_123",
      },
    };
  },
});

const invoices = defineModule({
  name: "invoices",

  routes: {
    "/invoices": {
      POST: route({
        before: [authGuard],

        body: z.object({
          amount: z.number().positive(),
          currency: z.string().length(3),
        }),

        handler: (ctx) => {
          return json(201, {
            id: "inv_123",
            amount: ctx.body.amount,
            currency: ctx.body.currency,
            createdBy: ctx.user.id,
          });
        },
      }),
    },
  },
});

export default defineApp({
  modules: [invoices],
});
```

Validation outputs are typed on the handler context:

```ts
ctx.body;
ctx.query;
ctx.params;
ctx.headers;
```

Guard enrichments are merged in declaration order. A guard may either:

- return context that becomes available to later guards and the handler; or
- return a typed `Response` and short-circuit the route.

## End-to-end typed client

Lugas exposes a browser-safe client through `lugas/client`.

```ts
import type { AppContract } from "lugas";
import { createClient } from "lugas/client";

import app from "./app";

type API = AppContract<typeof app>;

const api = createClient<API>({
  baseUrl: "https://api.example.com",
});

const result = await api.post("/invoices", {
  body: {
    amount: 125,
    currency: "USD",
  },

  headers: {
    authorization: "Bearer token",
  },
});

if (result.ok) {
  console.log(result.status);
  console.log(result.data.id);
} else {
  console.error(result.status);
  console.error(result.error);
}
```

The client provides compile-time checks for:

- supported paths;
- supported methods for each path;
- route parameters;
- query values;
- headers;
- request bodies;
- success statuses;
- error statuses.

The client deliberately uses explicit method calls and path strings:

```ts
api.get("/users/:id", {
  params: {
    id: "usr_123",
  },
});
```

It does not use a runtime `Proxy`, generated SDK, or object-tree RPC façade.

### Wire-honest types

Client request types are derived from schema input types, while handlers receive schema output types.

For transforming schemas, this distinction matters:

```text
Client sends the wire input
          ↓
Schema validates and transforms
          ↓
Handler receives the transformed output
```

Typed JSON responses model their serialized representation rather than blindly exposing the original in-memory object type.

For example:

```ts
json(200, {
  createdAt: new Date(),
});
```

is observed by the client as:

```ts
{
  createdAt: string;
}
```

The response helpers also own their media types so that the type brand and the client’s decoding behavior cannot silently disagree.

## Testing

Use `lugas/testing` to run an application through a real ephemeral server.

```ts
import { expect, test } from "bun:test";
import { createTestServer } from "lugas/testing";

import app from "./app";

test("creates an invoice", async () => {
  const server = createTestServer(app, {
    port: 0,
  });

  try {
    const response = await server.fetch("/invoices", {
      method: "POST",

      headers: {
        authorization: "Bearer test-token",
        "content-type": "application/json",
      },

      body: JSON.stringify({
        amount: 125,
        currency: "USD",
      }),
    });

    expect(response.status).toBe(201);
  } finally {
    await server.stop();
  }
});
```

The testing package is intended for:

- route integration tests;
- validation tests;
- guard-order tests;
- error-contract tests;
- application lifecycle tests.

## CLI

Inspect an application without manually tracing route composition:

```bash
bunx lugas routes ./app.ts
```

Generate the complete static manifest:

```bash
bunx lugas inspect ./app.ts
```

The manifest uses the versioned `lugas-manifest-v1` format and is intended for:

- humans;
- CI checks;
- coding agents;
- documentation generators;
- future OpenAPI tooling.

## Error handling

Lugas uses RFC 9457 Problem Details for structured HTTP errors.

Built-in error cases include:

| Condition | Status |
|---|---:|
| Malformed JSON | `400` |
| Unsupported media type | `415` |
| Validation failure | `422` |
| Unhandled internal error | `500` |

Handler exceptions are converted to redacted `500` responses. Stack traces and internal implementation details are not exposed to clients.

Typed response helpers include:

```ts
json(status, body);
text(status, body);
problem(status, problem);
empty(status);
```

Each helper enforces a compatible response media type.

## Design principles

### Explicit HTTP over disguised RPC

Methods, paths, statuses, headers, and transport failures remain visible.

### Types should describe the wire

Request types describe what crosses the network. Handler types describe values after validation and transformation. Response types describe what the client can actually decode.

### No code generation

The server contract is inferred directly from the application type.

### No runtime route proxy

The typed client delegates to ordinary `fetch`.

### Zero forced ecosystem

The core does not own your database, logger vendor, deployment platform, or authentication product.

### Deterministic inspection

The route graph is available as a stable manifest rather than existing only as runtime behavior.

### Batteries included, not batteries forced

Common integrations should be maintained by the project, but applications must opt into behavior that affects security, infrastructure, or external dependencies.

## Planned first-party batteries

The following capabilities are planned after the initial beta. They are **not part of `v0.1.0-beta.1` unless a later release explicitly documents them as available**.

### OpenAPI 3.1

Lugas plans to generate an OpenAPI document from:

- route methods and paths;
- path parameters;
- request bodies;
- response statuses;
- Problem Details responses;
- explicit route metadata;
- schemas that expose a Standard JSON Schema representation.

Standard Schema validation alone does not guarantee runtime schema introspection. Validators without a JSON Schema representation will require explicit OpenAPI metadata rather than receiving a guessed or incomplete schema.

The OpenAPI document should be available as JSON and usable independently of any documentation UI.

### Scalar API reference

Scalar is planned as an optional presentation layer over the generated OpenAPI document.

Proposed behavior:

- OpenAPI JSON remains the canonical contract.
- Scalar documentation is opt-in.
- Starter projects may enable `/docs` during development.
- Production exposure must be explicit.
- Applications may disable interactive requests or protect the documentation route.

Scalar should remain replaceable. Users must still be able to consume the OpenAPI document with other tools.

### CORS

Lugas plans to provide maintained CORS middleware with:

- explicit origin allowlists;
- callback-based origin decisions;
- preflight handling;
- exposed and allowed headers;
- credential configuration;
- `Vary: Origin` correctness;
- stable configuration diagnostics.

CORS will not default to a permissive wildcard policy.

The safe default remains:

> No cross-origin access unless the application explicitly enables it.

### Server-Sent Events

SSE is planned as a native response helper built on web streams.

Expected responsibilities include:

- correct `text/event-stream` headers;
- event IDs;
- named events;
- retry hints;
- comments and heartbeats;
- serialization helpers;
- cancellation handling;
- backpressure-aware streaming;
- deterministic cleanup when the connection closes.

SSE belongs close to the core because it is an HTTP response primitive, not an infrastructure product.

### Structured logging

Lugas plans to expose a small logger contract rather than binding the framework to one logging vendor.

The built-in implementation should remain dependency-free and support:

- structured JSON logs;
- request IDs;
- method and route;
- response status;
- request duration;
- stable diagnostic codes;
- error redaction;
- child logger context;
- configurable log levels.

Applications should be able to adapt the contract to Pino, OpenTelemetry-aware loggers, or another logging system without changing route code.

Sensitive headers, cookies, authorization values, and request bodies must not be logged by default.

### Drizzle ORM integration

Drizzle support is planned as an optional first-party integration, not a core dependency.

The adapter should:

- accept an application-owned Drizzle instance;
- expose that instance through typed guard or service context;
- avoid opening hidden global connections;
- avoid running migrations during ordinary server startup;
- support explicit startup and shutdown hooks;
- document Bun SQL and Bun SQLite examples;
- remain replaceable by another database layer.

Lugas should not become an ORM framework. The application must continue to own:

- schema design;
- migrations;
- transactions;
- connection pooling;
- tenancy boundaries;
- database credentials;
- shutdown behavior.

## Proposed integration defaults

Once the planned integrations land, the intended defaults are:

| Capability | Proposed default |
|---|---|
| OpenAPI document | Explicitly enabled; starter may enable in development |
| Scalar UI | Development-only in starter; explicit in production |
| CORS | Disabled unless configured |
| SSE | Available per route |
| Access logging | Concise development logging; explicit production policy |
| Drizzle | Never initialized implicitly |

## Where Lugas fits

| Framework style | Best fit |
|---|---|
| **Lugas** | Bun-native APIs that value explicit HTTP, wire-honest types, deterministic inspection, and a small dependency surface |
| **Elysia** | Bun applications that prefer a broader framework ecosystem and highly ergonomic end-to-end inference |
| **Hono** | Applications that prioritize Web Standards and deployment across many runtimes |
| **Fastify** | Mature Node.js services that need an established plugin and operations ecosystem |
| **tRPC** | Full-stack TypeScript applications that prefer procedure-oriented RPC over visible HTTP contracts |
| **Raw Bun** | Applications that want maximum control and are prepared to build validation, composition, clients, diagnostics, and testing conventions themselves |

Lugas is not trying to be every framework at once.

Its intended position is:

> **The explicit, low-magic, Bun-native typed HTTP framework.**

## Advantages

- Bun-native execution.
- Explicit HTTP methods, paths, statuses, and transport behavior.
- End-to-end typed client without code generation.
- Wire-honest request and response types.
- Standard Schema interoperability.
- Stable diagnostics and Problem Details errors.
- Ordered typed guards.
- Static manifest inspection.
- Zero core production dependencies.
- Small and auditable runtime surface.
- Friendly to human developers and coding agents.

## Trade-offs

- Bun-only server runtime.
- Narrower ecosystem than established frameworks.
- No Node.js server compatibility.
- No built-in ORM, authentication system, or deployment platform.
- More explicit client calls than object-tree RPC clients.
- Browser client evidence is currently bundle-level rather than full cross-browser automation.
- Pre-1.0 APIs may still evolve based on beta feedback.

## Compatibility

The beta supports:

- Bun 1.4.0;
- the tested latest Bun 1.4.x patch;
- Linux x86-64;
- macOS arm64;
- Windows x64;
- TypeScript 7.0.2;
- Zod 4.4.3;
- Valibot 1.4.2;
- Standard Schema v1 implementations.

See [`docs/compatibility.md`](docs/compatibility.md) for the full verified matrix and explicit non-goals.

## Known beta limitations

- The server core and CLI are Bun-only.
- Bun versions outside 1.4.x are not currently supported.
- TypeScript declarations ship as direct `.ts` sources.
- Real-browser automation is not yet part of CI.
- In-flight handler work is not automatically cancelled when a client disconnects.
- The ecosystem is intentionally small during the first beta.
- OpenAPI, Scalar, CORS, SSE, structured logging, and Drizzle integration are planned rather than currently shipped.

## Performance and release evidence

Lugas maintains frozen release budgets and candidate-bound evidence for its own release process.

These measurements prove that a release candidate clears the project’s declared budgets. They are not presented as independent cross-framework benchmark claims.

See:

- [`docs/releases/beta/RELEASE_PACKET.md`](docs/releases/beta/RELEASE_PACKET.md)
- [`docs/releases/beta/release-evidence.json`](docs/releases/beta/release-evidence.json)
- [`docs/releases/beta/provenance.json`](docs/releases/beta/provenance.json)
- [`docs/releases/beta/SHA256SUMS`](docs/releases/beta/SHA256SUMS)

## Project status

The framework implementation, compatibility matrix, clean-room review, package rehearsal, and candidate attestation are complete for `v0.1.0-beta.1`.

The remaining publication action is intentionally owner-controlled. Until that action occurs:

- no npm package should be assumed available;
- no GitHub release should be assumed published;
- the attested tarball must not be rebuilt or modified;
- publication must follow the committed release checklist.

See [`docs/releases/beta/CHECKLIST.md`](docs/releases/beta/CHECKLIST.md).

## Security

Read [`SECURITY.md`](SECURITY.md) for the coordinated vulnerability disclosure policy.

Do not open a public issue for an undisclosed security vulnerability.

## Documentation

- [`docs/compatibility.md`](docs/compatibility.md) — supported environments and toolchains.
- [`docs/okf/architecture/`](docs/okf/architecture/) — architecture decisions and contracts.
- [`docs/reports/`](docs/reports/) — implementation and review evidence.
- [`docs/releases/beta/`](docs/releases/beta/) — attested beta artifacts.
- [`AGENTS.md`](AGENTS.md) — operating rules for human and AI contributors.
- [`llms.txt`](llms.txt) — compact context for coding agents.
- [`llms-full.txt`](llms-full.txt) — expanded agent-facing documentation.

## Contributing

Lugas is entering its external-validation phase.

The highest-value contributions are:

- real applications built from the published package;
- documentation feedback;
- type-inference reproductions;
- cross-platform reports;
- browser-client verification;
- integration proposals with narrow, testable contracts;
- production-shaped examples;
- security and failure-mode reviews.

Before opening a large feature pull request, start with an issue describing:

- the user problem;
- why the capability belongs in Lugas;
- whether it belongs in core or an optional integration;
- its effect on the zero-dependency core;
- the proposed public contract;
- its testing and compatibility requirements.

## License

Apache-2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).