---
title: "Cookies and auth interop"
description: "RFC 6265 primitives and the Better Auth guard recipe."
---
Lugas ships two cookie primitives — a reader and a writer — and deliberately nothing more. No session store, no signing, no identity: cookie-based auth is an application composition over [guards](/lugas/guards/), and auth libraries (Better Auth is the documented example) integrate as ordinary dependencies. See [ADR-0027](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0027-cookies-auth-interop.md) for the contract.

## Reading cookies

`parseCookies(request)` parses the request's `Cookie` header per RFC 6265 into a plain map. It is **lenient by design**: hostile or malformed input is skipped, never thrown — a bad header must not become a per-request 500.

```ts
import { parseCookies } from "lugas";

const cookies = parseCookies(ctx.request);   // Record<string, string>
const token = cookies["session"];            // string | undefined
```

Rules worth knowing:

- No `Cookie` header → `{}`.
- Duplicated names collapse **last-wins** (RFC 6265 sender rules).
- Quoted values keep their quotes (`a="v"` → `"{v}"` — exactly `"v"` with quotes); percent-decoding is the application's choice (`decodeURIComponent`), not the framework's.
- Segments starting with `$` are skipped as reserved.

## Setting cookies

`cookie(name, value, attrs?)` serializes one `Set-Cookie` entry and composes with the typed response helpers through `init.headers` — a `[name, value][]` array preserves **multiple** `Set-Cookie` headers:

```ts
import { cookie, json, route } from "lugas";

route({
  handler: () =>
    json(200, { ok: true }, {
      headers: [
        ["set-cookie", cookie("session", token, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24,
        })],
        ["set-cookie", cookie("theme", "dark", { path: "/" })],
      ] as [string, string][],
    }),
});
```

Attributes: `httpOnly`, `secure`, `sameSite` (`"strict" | "lax" | "none"`), `path`, `domain`, `maxAge` (seconds; negative expires), `expires` (prefer `maxAge`), `partitioned`.

Serialization is **strict, fail-closed** — the write path is a contract:

- Invalid name/value tokens throw `LUGAS_COOKIE_001` at call time (before anything malformed reaches the wire). Values exclude whitespace, `"`, `,`, `;`, `\` — encode richer values with `encodeURIComponent` yourself.
- Invalid attribute combinations throw `LUGAS_COOKIE_002` — most importantly `sameSite: "none"` without `secure: true`, which browsers silently reject; Lugas refuses it loudly instead.

The read/write asymmetry is deliberate: reads are lenient because input is hostile; writes are strict because output is yours.

## Deleting a cookie

There is no delete function — expiry *is* deletion. Set the name with an empty value and a non-positive `maxAge`:

```ts
["set-cookie", cookie("session", "", { path: "/", maxAge: 0 })]
```

## Auth interop recipe (Better Auth)

The pattern is one guard: read the session cookie, validate it against your auth library, return enrichment or a short-circuit. Better Auth (or any cookie-session library) composes exactly this way — Lugas adds no wrapper and takes no dependency.

```ts
import { guard, json, parseCookies, route } from "lugas";
import { betterAuth } from "better-auth";           // application dependency
import { toNodeHeaders } from "./header-bridge";    // if the library wants Node-style headers

const auth = betterAuth({ /* your config: database, secret, … */ });

const authGuard = guard({
  name: "auth",
  handler: async ({ request }) => {
    const cookies = parseCookies(request);
    const raw = cookies[auth.options.cookies?.sessionToken?.name ?? "better-auth.session_token"];
    if (raw === undefined) return json(401, { error: "no session" });

    // Application-owned validation — call the library with the cookie value.
    const session = await auth.api.getSession({ headers: { cookie: `${name}=${raw}` } });
    if (!session) return json(401, { error: "invalid session" });
    return { user: session.user, session: session.session };
  },
});

route({
  before: [authGuard],
  handler: (ctx) => json(200, { userId: ctx.user.id }),
});
```

What Lugas owns: the two primitives and the guard contract. What the application owns: the library, its configuration, its database, and what lands in the enrichment. Signed cookies, if you want them without a library, are a ~10-line recipe — hash `value` with an HMAC and your secret, verify in the guard; Lugas will not grow a signing API (ADR-0027 alternatives record why).

## CSRF note

CSRF defense is coupled to session semantics, so it is not a first-party helper. The standard composition with these primitives: keep the session cookie `sameSite: "lax"` (or `"strict"`), and for state-changing routes require a second token (header or body) that scripts on other origins cannot read. Document your chosen pattern in your own docs — the framework deliberately has no opinion.

## Diagnostics

| Code | Thrown by | Meaning |
|---|---|---|
| `LUGAS_COOKIE_001` | `cookie()` | Invalid cookie name or value token |
| `LUGAS_COOKIE_002` | `cookie()` | Invalid attributes or attribute combination (`SameSite=None` without `Secure`, empty `path`/`domain`, non-integer `maxAge`, invalid `expires`) |

Full catalog: [`diagnostics.md`](/lugas/diagnostics/).
