---
type: Guide
title: Getting Started
status: current
tags:
- guide
- getting-started
---

# Getting started

## Install

```bash
bun add lugas@beta
```

Lugas requires [Bun](https://bun.sh) 1.4.x. TypeScript 7.0.2 is the verified toolchain for the full compile-time contract experience.

> The `v0.1.0-beta.1` candidate is attested but **not yet published** — npm publication is an explicit owner action. Until it is announced, the package should not be assumed available.

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
curl http://localhost:3000/hello
```

## Validation and typed guards

Lugas accepts validators that implement Standard Schema v1 (Zod, Valibot, or any conforming implementation).

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
import type app from "./app";

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

The client provides compile-time checks for supported paths and methods, route parameters, query values, headers, request bodies, and success/error statuses. It deliberately uses explicit method calls and path strings:

```ts
api.get("/users/:id", {
  params: {
    id: "usr_123",
  },
});
```

No runtime `Proxy`, generated SDK, or object-tree RPC façade. How response types model serialization truth is covered in [wire-honest types](./wire-honest-types.md).

## Using the client without a build step

The release package ships a prebuilt, browser-executable ESM artifact of the client, exposed as the `lugas/client/browser` subpath (file `build/lugas-client.esm.js`). The `.ts` sources remain the only type source of truth; the artifact is runtime JavaScript only. Three consumption arrangements:

1. **Same-origin serving** (pairs with [public assets](#serving-public-assets)): serve the installed artifact from your application origin and import it by URL.

   ```ts
   import { defineApp } from "lugas";

   export default defineApp({
     assets: {
       files: {
         "/": "./public/index.html",
         "/lugas-client.esm.js": "./node_modules/lugas/build/lugas-client.esm.js",
       },
     },
   });
   ```

   ```html
   <script type="module">
     import { createClient } from "/lugas-client.esm.js";
     const api = createClient({ baseUrl: window.location.origin });
   </script>
   ```

2. **Import map**: keep bare-specifier imports in page code and map them to the artifact URL.

   ```html
   <script type="importmap">
     { "imports": { "lugas/client": "/lugas-client.esm.js" } }
   </script>
   <script type="module">
     import { createClient } from "lugas/client";
   </script>
   ```

3. **Bundler**: keep importing `lugas/client` — the direct `.ts` sources remain shipped and bundle as before; nothing changes for bundler-based consumers.

Plain-JavaScript pages need no TypeScript configuration and no bundler. Editors and frontends that want static checking can use `checkJs` with their own `tsconfig.json` against the installed package — no declarations fork ships with the artifact. The artifact lane is same-origin only; it makes no CORS claim.

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

The testing package is intended for route integration tests, validation tests, guard-order tests, error-contract tests, and application lifecycle tests.

## CLI

Inspect an application without manually tracing route composition:

```bash
bunx lugas routes ./app.ts    # human-readable route table
bunx lugas inspect ./app.ts   # full lugas-manifest-v1 JSON
```

The manifest uses the versioned `lugas-manifest-v1` format and is intended for humans, CI checks, coding agents, documentation generators, and future OpenAPI tooling. See [`manifest-v1.md`](./manifest-v1.md).

## Error handling

Lugas uses RFC 9457 Problem Details (`application/problem+json`) for structured HTTP errors.

| Condition | Status | Note |
|---|---:|---|
| Malformed JSON | `400` | `MALFORMED_JSON` |
| Unsupported media type | `415` | `UNSUPPORTED_MEDIA_TYPE` |
| Validation failure | `422` | `VALIDATION_FAILED` |
| Unhandled internal error | `500` | redacted; no stack traces or internals reach the client |

Typed response helpers, each enforcing a compatible response media type:

```ts
json(status, body);
text(status, body);
problem(status, problem);
empty(status);
```

## Serving public assets

Opt-in, same-origin, no build step (ADR-0018):

```ts
import { defineApp, json, route } from "lugas";

const app = defineApp({
  routes: {
    "/api/ping": {
      GET: route({ handler: () => json(200, { pong: true }) }),
    },
  },
  assets: {
    files: { "/index.html": "./public/index.html" },
    dirs: { "/assets/*": "./public/assets" },
  },
});
```

- File mappings are exact literal paths (`/robots.txt`); directory mounts are explicit prefixes ending in `/*` (root catch-alls are not supported).
- Native directory mounts (`assets.dirs`) require Linux with `openat2(RESOLVE_IN_ROOT)` for symlink containment; on macOS and Windows, configuring directory mounts fails closed at startup (`LUGAS_ASSET_004`). Explicit file mappings (`assets.files`) are supported across all platforms.
- Assets are served natively by Bun: correct MIME types, `ETag`/`Last-Modified` conditional requests, and range requests.
- Methods: GET and HEAD serve assets. Other methods reach the app's not-found policy — a 405 is not promised.
- Misses stay distinguishable: a missing file under `/assets/*` is a plain asset 404; an unknown API path gets your API's not-found response.
- Ownership is validated at startup: an asset declaration that overlaps an API route (or another asset declaration) fails with `LUGAS_ASSET_002` instead of silently winning or losing by declaration order.
- Keep protected files outside served directories; asset responses bypass guards and `onError` (they never enter the request pipeline).

## Next steps

- [`examples/`](../examples/README.md) — runnable single-concept applications.
- [`wire-honest-types.md`](./wire-honest-types.md) — what the client type really says about your JSON.
- [`choosing-lugas.md`](./choosing-lugas.md) — where Lugas fits.
- [`diagnostics.md`](./diagnostics.md) — the `LUGAS_*` diagnostic catalog.
