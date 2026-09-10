---
title: "Guards"
description: "Ordered guards with typed context enrichment and short-circuits."
---
Guards are named, ordered functions that run **before** a route handler (ADR-0011). A guard either enriches the request context (authentication, tenant resolution, feature flags) or short-circuits with a `Response` (401, 403, rate-limit …). There is no implicit middleware: every guard on a route appears in its `before` array, in execution order, and in the manifest.

## Defining a guard

`guard()` takes exactly two keys — a stable `name` (it appears in manifests and diagnostics) and a `handler`. Anything else is rejected at creation (`LUGAS_GUARD_002`).

```ts
import { guard, json } from "lugas";

const authenticate = guard({
  name: "authenticate",
  handler: ({ request }) => {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return json(401, { error: "Missing or invalid Bearer token" });
    }
    const token = authorization.slice(7);
    if (token !== "admin-token" && token !== "member-token") {
      return json(401, { error: "Invalid token credentials" });
    }
    return { user: { id: "usr_123", role: "admin" } };   // enrichment object
  },
});
```

The handler receives `{ request, services, ...earlier enrichments }` and may return:

- **an enrichment object** — merged into the context for later guards and the handler;
- **a `Response`** (typed helper or native) — the route short-circuits; later guards and the handler never run;
- **a `Promise` of either** — guards may be async, per guard (mixed chains are fine).

Returning `undefined` or a primitive is a compile-time type error, and the executor rejects it at runtime — a guard that forgets to decide cannot slip through.

## Attaching guards

Guards are listed per method, in execution order:

```ts
import { defineApp, defineModule, route, json } from "lugas";

export default defineApp({
  routes: {
    "/public": {
      GET: route({ handler: () => json(200, { message: "public" }) }),
    },
    "/profile": {
      GET: route({
        before: [authenticate],
        handler: (ctx) => json(200, { user: ctx.user }),
      }),
    },
    "/admin/dashboard": {
      GET: route({
        before: [authenticate, requireAdmin],   // ordered: auth first, then role check
        handler: (ctx) => json(200, { user: ctx.user, adminVerified: ctx.adminVerified }),
      }),
    },
  },
});
```

Ordering is the contract: `requireAdmin` runs only if `authenticate` enriched (not short-circuited), and it can read `ctx.user`. The same guard list syntax works inside modules, and guards compose with validation — guards run after param/query/header validation and before body validation/handler execution in the compiled pipeline.

## Typed enrichment

The handler's context type is **computed from the route descriptor**: each guard's non-`Response` return type is intersected in declaration order.

```ts
before: [authenticate]        // returns { user: { id: string; role: string } }
// ⇒ handler ctx.user is { id: string; role: string }

before: [authenticate, requireAdmin]
// ⇒ ctx.user AND ctx.adminVerified (boolean), both present
```

Collision semantics are deliberately loud. If two guards claim the same key with **different** types, the property collapses to `never` at compile time — mirroring the runtime, which refuses the silent shadow. Identical types merge cleanly.

Reserved framework keys (`request`, `services`, `params`, `query`, `headers`, `body`) can never be overwritten by an enrichment; the runtime throws if one attempts it.

## Reading earlier enrichments inside a guard

Inside a guard, earlier guards' enrichments arrive through the context index signature (typed `unknown`) — the descriptor-derived types apply to the **handler**. Narrow with an ordinary runtime check:

```ts
const requireAdmin = guard({
  name: "requireAdmin",
  handler: (ctx) => {
    const user = ctx.user;   // unknown here
    const isAdmin = typeof user === "object" && user !== null && "role" in user && user.role === "admin";
    if (!isAdmin) {
      return json(403, { error: "Admin role required" });
    }
    return { adminVerified: true };
  },
});
```

This is intentional: guard order is chosen per route (`before: [a, b]` vs `[b, a]`), so a guard's input types cannot assume a particular chain.

## Guards and services

Guards close over the app's services like handlers do. Inject dependencies explicitly instead of importing module state:

```ts
import type { createClient } from "some-kv-client";

export function makeSessionGuard(kv: KVClient) {
  return guard({
    name: "session",
    handler: async ({ request }) => {
      const session = await kv.get(request.headers.get("cookie") ?? "");
      return session ? { session } : json(401, { error: "no session" });
    },
  });
}

// per app: before: [makeSessionGuard(kv)]
```

## What guards are not

- **Not middleware**: there is no app-level `use()`. A guard runs where it is listed, and the manifest records exactly that.
- **Not auth product**: Lugas ships no JWT/OAuth/session machinery — the guard contract is the integration point (see the non-goals in [`design-principles.md`](/lugas/design-principles/)).
- **Not for static assets**: asset responses bypass the pipeline entirely.

## Where next

- [Validation](/lugas/validation/) — the slots validated before your guards see the context.
- [Responses](/lugas/responses/) — typed short-circuit responses and the error policy.
- [Testing](/lugas/testing/) — asserting guard order through a real server.
