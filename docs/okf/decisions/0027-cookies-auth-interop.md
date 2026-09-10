---
type: Architecture Decision Record
title: 'ADR-0027 — Cookie Primitives Without an Auth Framework'
status: accepted
tags:
- adr
- architecture
- cookies
- http
- '0027'
generated:
  by: zcode/glm
  at: '2026-09-10T00:00:00+07:00'
---

# ADR-0027 — Cookie Primitives Without an Auth Framework

## Status

Accepted by owner decision (ODR-0011, `docs/owner-decisions/m9-002-dispatch.md`, 2026-09-10), dispatching issue [#362](https://github.com/ther12k/lugas/issues/362) (M9-002). Fulfills item (a) of the post-beta.2 owner sequence recorded in ODR-0010.

## Context

Cookie-based authentication is the dominant web integration pattern, and the owner's roadmap explicitly names auth interoperability (Better Auth as the example) as the next battery. Lugas handlers already touch cookies today through the native `Headers` API — but every application hand-writes the same two snippets: parsing the `Cookie` header into a map, and serializing a `Set-Cookie` header with the right attributes. Both are easy to get subtly wrong (`SameSite=None` without `Secure` is silently rejected by browsers; malformed names produce silently dropped headers).

The pull in the wrong direction is to grow a session/product layer: signed cookies, session stores, identity, CSRF token machinery. That violates the standing first-party non-goals (ODR-0010) and ADR-0003 minimality. Lugas is an HTTP framework: the defensible first-party surface is exactly the two RFC 6265 primitives — read and write — done honestly, with the framework's signature fail-closed diagnostics on the write path.

A hard constraint carries over from ADR-0026's rehearsal discipline: zero production dependencies. The primitives are small enough that any dependency would be absurd; the point is recorded so the packaging assertion stays authoritative.

## Decision

Lugas ships two additive root exports (HTTP primitives, core-adjacent like `json`/`problem` — not an optional integration subpath):

1. **`parseCookies(request)`** — parses the request's `Cookie` header per RFC 6265 `cookie-pair` grammar into a plain `Record<string, string>`. Lenient by design: malformed pairs are skipped, never thrown — a hostile header must not become a per-request 500. Parsing returns bytes; value interpretation (URL-decoding, JSON) is the application's.
2. **`cookie(name, value, attrs?)`** — serializes one `Set-Cookie` header entry with typed attributes: `httpOnly`, `secure`, `sameSite` (`"strict" | "lax" | "none"`), `path`, `domain`, `maxAge`, `expires`, `partitioned`. The return value composes with the typed response helpers through `init.headers`, preserving multiple `Set-Cookie` headers per response.
3. **Fail closed at serialization:** invalid name/value tokens and invalid attribute combinations — `SameSite=None` without `Secure` — throw stable diagnostics (`LUGAS_COOKIE_001`, `LUGAS_COOKIE_002`) at call time, before anything malformed can reach the wire. The asymmetry with `parseCookies` is deliberate: reads are lenient (input is hostile), writes are strict (output is a contract).
4. **No auth product:** no cookie signing/encryption helpers, no session store, no CSRF token machinery, no identity types. Signed cookies are an application recipe (documented, not implemented). This is the ODR-0010 standing non-goals list, unchanged.
5. **Interop by composition:** auth frameworks (Better Auth is the documented example) integrate through ordinary guards — read the session cookie with `parseCookies`, validate against the framework's API, return enrichment or a short-circuit response. `docs/cookies.md` pins the recipe with a tested composition; no auth dependency enters Lugas.
6. **Packaging:** additive exports in `src/index.ts` only; no new subpath, `package.json`/`bun.lock` untouched, client/testing import graphs unchanged (graph checks must confirm).
7. **Diagnostics:** `LUGAS_COOKIE_001` (invalid cookie name or value token), `LUGAS_COOKIE_002` (invalid attribute combination) — catalogued; goldens regenerated with the reason recorded in the evidence report.

## Consequences

- Positive: the cookie-based auth story completes with two pure functions — no lifecycle, no pipeline, no config surface added.
- Positive: the framework's fail-closed character extends to the one place cookies genuinely fail (serialization), while staying honest about the read path.
- Cost/tradeoff: applications wanting signed cookies write ~10 lines or adopt an interop library; Lugas documents the recipe but ships nothing.
- Cost/tradeoff: `parseCookies` returns a plain map; repeated cookie names collapse last-wins per RFC 6265 sender rules — documented, not encoded as a richer type.
- Compatibility effect: two additive root exports; nothing existing changes.

## Alternatives considered

- **`lugas/cookies` subpath:** rejected — subpaths are for optional integrations (drizzle); these are HTTP primitives like `json()`. A subpath would add import friction for zero isolation benefit. Revisit only if the root surface grows enough to violate discoverability.
- **`ctx.cookies` on the handler context:** rejected — context slots are computed from declared schemas and guard enrichments (ADR-0011 derivation); a framework-parsed `ctx.cookies` would imply per-request parsing cost on routes that never read cookies, and a second way to observe the same header. A guard may enrich `ctx.session` from `parseCookies` where needed.
- **Signed-cookie helper (`cookie(name, value, { sign: key })`):** rejected — key selection, rotation, and algorithm choice are exactly the auth-product surface ODR-0010 excludes; a half-signature invites misuse.
- **First-party CSRF middleware:** rejected — CSRF defense is coupled to session semantics the framework does not own; the interop recipe documents the pattern.
- **Making `problem()`/`redirect()` set cookies directly:** rejected — response helpers own exactly one media type each (M6R8 rule); cookie attachment stays in `init.headers` where `Headers` semantics already live.

## Evidence

Implementation issue [#362](https://github.com/ther12k/lugas/issues/362) (M9-002) delivers behavior tests (parsing leniency, serialization attributes, fail-closed diagnostics, multi-cookie composition through `lugas/testing`), the `docs/cookies.md` interop recipe, and diagnostics goldens; evidence report `docs/reports/issues/M9-002.md`.

## Revisit trigger

If a battery genuinely needs per-request cookie context at scale (evidence of repeated guard boilerplate across applications), a `cookies` schema slot — validated like `headers` — can be added by ADR amendment with benchmarks; do not add it speculatively.
