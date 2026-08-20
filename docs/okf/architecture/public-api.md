---
type: API Specification
title: Proposed LugasJS Public API
status: draft
tags:
- api
- public
- typescript
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Proposed LugasJS Public API

The semantic API is frozen by this document; exact generic encoding remains subject to the M0 type-feasibility spike.

## Primary import

```ts
import {
  defineApp,
  defineModule,
  route,
  guard,
  json,
  text,
  empty,
  problem,
  redirect,
} from "lugas";
```

The target is no more than twelve primary public values for beta.

## Canonical example

```ts
import {
  defineApp,
  defineModule,
  route,
  guard,
  json,
  problem,
} from "lugas";
import * as v from "valibot";

const services = {
  users: createUserRepository(),
  sessions: createSessionService(),
};

type Services = typeof services;

const requireUser = guard<Services>({
  name: "requireUser",
  async handler({ request, services }) {
    const actor = await services.sessions.fromRequest(request);

    if (!actor) {
      return problem(401, {
        code: "UNAUTHORIZED",
        title: "Authentication required",
      });
    }

    return { actor };
  },
});

const users = defineModule<Services>({
  name: "users",
  routes: {
    "/users/:id": {
      GET: route({
        params: v.object({ id: v.string() }),
        before: [requireUser],

        async handler({ params, actor, services }) {
          const user = await services.users.find(params.id);

          if (!user) {
            return problem(404, {
              code: "USER_NOT_FOUND",
              title: "User not found",
            });
          }

          return json(200, { data: user, requestedBy: actor.id });
        },
      }),
    },
  },
});

export const app = defineApp({
  services,

  routes: {
    "/health": new Response("OK"),
    "/assets/*": { dir: "./public" },
  },

  modules: [users],
});

export type API = typeof app;
export default app.serve({ port: 3000 });
```

The explicit `<Services>` annotation is acceptable if TypeScript cannot infer cross-module context reliably. M0-009 must compare this with a stateless type-bound definition kit and select one canonical syntax; it must not introduce a mutable Elysia-like builder merely to remove one annotation.

## `defineApp(config)`

Accepts:

- `services`: optional application-owned object;
- `routes`: optional root route map containing native Bun values or descriptors;
- `modules`: optional ordered array of named modules;
- `notFound`: optional fallback for unmatched requests;
- `onError`: optional unexpected-error policy;
- safe server defaults that do not duplicate options passed to `app.serve`.

Returns a typed `LugasApp` with:

- `manifest`: readonly deterministic runtime manifest;
- `serve(options)`: creates and returns a native Bun server;
- an erased contract type used by `lugas/client`;
- internal compiled route state not exported as public API.

## `defineModule(config)`

Creates a named container of full-path routes. It has no hidden prefix, lifecycle scope, service locator, or runtime plugin behavior.

## `route(config)`

Accepts optional `params`, `query`, `headers`, and `body` Standard Schema values; optional ordered `before` guards; and one required `handler`. It returns a descriptor, not a handler.

## `guard(config)`

Requires a stable `name` and a handler. The handler returns:

- an object to enrich context;
- a native/typed `Response` to stop processing;
- or a promise of either.

Returning `undefined`, primitives, or ambiguous unions is rejected by types or startup validation.

## Response helpers

- `json(status, body, init?)`
- `text(status, body, init?)`
- `empty(status, init?)`
- `problem(status, fields, init?)`
- `redirect(location, status?)`

Every helper returns a genuine `Response`. `redirect` is limited to valid redirect status codes at the type level where practical.

## Subpath exports

```ts
import { createClient } from "lugas/client";
import { createTestServer } from "lugas/testing";
```

No client symbol is re-exported from the server root if doing so would couple browser bundles to Bun-specific code.
