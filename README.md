# LugasJS

**Lugas** is a small, explicit, Bun-native TypeScript framework: raw `Bun.serve` performance with typed routes, Standard Schema validation, ordered guards with typed context enrichment, RFC 9457 Problem Details errors, an end-to-end typed client, and test helpers — with **zero production runtime dependencies**.

> **Status:** public beta **v0.1.0-beta.1** · Runtime: **Bun 1.4.x** · License: Apache-2.0

## Install

```bash
bun add lugas@beta
```

Requires [Bun](https://bun.sh) 1.4.x. TypeScript 7.0.2 recommended for the full compile-time contract experience.

## Hello world

```ts
import { defineApp, route, json } from "lugas";

const app = defineApp({
  routes: {
    "/hello": {
      GET: route({
        handler: () => json(200, { hello: "world" }),
      }),
    },
  },
});

export default app;
```

Run it:

```ts
// server.ts
import app from "./app"; // the defineApp instance above

const server = Bun.serve(app.serve({ port: 3000 }).options ?? {});
console.log(`listening on ${server.url}`);
```

Or start it directly from the app instance:

```ts
const server = app.serve({ port: 3000 });
console.log(`listening on ${server.url}`);
```

### With validation and guards

```ts
import { defineApp, defineModule, guard, route, json } from "lugas";
import { z } from "zod"; // any Standard Schema v1 validator works

const auth = guard({
  name: "auth",
  handler: (ctx) => {
    if (!ctx.request.headers.get("authorization")) {
      return json(401, { error: "unauthorized" }); // short-circuit
    }
    return { user: { id: "u_1" } }; // enriches the handler context
  },
});

const invoices = defineModule({
  name: "invoices",
  routes: {
    "/invoices": {
      POST: route({
        before: [auth],
        body: z.object({ amount: z.number().positive() }),
        handler: (ctx) => json(201, { id: "inv_1", amount: ctx.body.amount, user: ctx.user.id }),
      }),
    },
  },
});

export default defineApp({ modules: [invoices] });
```

Schema outputs arrive typed on the handler context (`ctx.body`, `ctx.query`, `ctx.params`); guard enrichments merge in declaration order.

## Typed client (`lugas/client`)

```ts
import { createClient } from "lugas/client";
import type { AppContract } from "lugas";

const client = createClient<AppContract<typeof app>>({ baseUrl: "https://api.example.com" });

const res = await client.post("/invoices", { body: { amount: 42 } });
if (res.ok) {
  console.log(res.status, res.data);
} else {
  console.error(res.status, res.error); // Problem Details on 4xx/5xx
}
```

The client is platform-neutral: browser-safe bundle, no Bun globals, no `Proxy`.

## Testing (`lugas/testing`)

```ts
import { createTestServer } from "lugas/testing";
import app from "./app";

const server = createTestServer(app, { port: 0 });
const res = await server.fetch("/invoices", { method: "POST", body: JSON.stringify({ amount: 1 }) });
await server.stop();
```

## CLI

```bash
bun run src/cli/main.ts routes ./app.ts    # human-readable route table
bun run src/cli/main.ts inspect ./app.ts   # full manifest JSON (lugas-manifest-v1)
```

## Error handling

Errors follow RFC 9457 Problem Details (`application/problem+json`) with stable codes:
`VALIDATION_FAILED` (422), `UNSUPPORTED_MEDIA_TYPE` (415), `MALFORMED_JSON` (400).
Handler exceptions are redacted to a safe 500 — stack traces and internals never reach the client.

## Known limitations (beta)

- Bun-only through 1.x: the server core and CLI do not run on Node (the browser client bundle does).
- TypeScript declarations ship as direct `.ts` sources; no separate `.d.ts` build.
- In-flight handler work is not cancelled on client disconnect.

## Security

See [`SECURITY.md`](SECURITY.md) for the coordinated disclosure policy. Do not open public issues for vulnerabilities.

## Documentation & project layout

- [`docs/compatibility.md`](docs/compatibility.md) — supported platforms and toolchains.
- [`docs/releases/beta/RELEASE_PACKET.md`](docs/releases/beta/RELEASE_PACKET.md) — release candidate evidence packet.
- [`docs/reports/`](docs/reports/) — per-issue implementation evidence and gate reviews.
- [`AGENTS.md`](AGENTS.md) — operating rules for human and AI contributors; [`docs/okf/`](docs/okf/index.md) — architecture, standards, and delivery history.

## License

Apache-2.0 — see [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
