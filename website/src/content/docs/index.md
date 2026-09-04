---
title: Lugas
description: Explicit, Bun-native typed HTTP APIs — without runtime proxies, code generation, or production dependencies.
head:
  - tag: title
    content: Lugas — Explicit, Bun-native typed HTTP APIs
hero:
  tagline: Explicit, Bun-native typed HTTP APIs — without runtime proxies, code generation, or production dependencies.
  actions:
    - text: Getting started
      link: /getting-started/
      icon: right-arrow
    - text: Examples on GitHub
      link: https://github.com/ther12k/lugas/tree/main/examples
      icon: external
---

Lugas is a small, explicit, Bun-native TypeScript framework: raw `Bun.serve` performance with typed routes, Standard Schema validation, ordered guards with typed context enrichment, RFC 9457 Problem Details errors, an end-to-end typed client, and test helpers — with **zero production runtime dependencies**.

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

Routes stay ordinary HTTP: native `Request`, explicit statuses, real `fetch` underneath. The typed client observes what the wire actually carries — a `Date` field arrives as a `string`, not a pretend `Date`.

- **Typed end to end** — routes, validation, guards, responses, and client derived from one application type. No code generation, no runtime `Proxy`.
- **Wire-honest responses** — response types model `JSON.stringify` truth, including drops, non-finite numbers, and throws.
- **Inspectable** — the route graph is a stable `lugas-manifest-v1` manifest, for humans, CI, and coding agents.

Current status: attested `v0.1.0-beta.1` release candidate; npm publication is pending owner sign-off. See the [roadmap](/roadmap/) for shipped and planned capabilities.
