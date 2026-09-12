---
type: Architecture Decision Record
title: 'ADR-0037 — Opt-In SPA Hosting: Explicit Navigation Ownership and a Policy-Capable Shell'
status: accepted
tags:
- adr
- architecture
- static-assets
- spa
- hosting
- '0037'
generated:
  by: zcode/glm
  at: '2026-09-12T00:00:00+07:00'
---

# ADR-0037 — Opt-In SPA Hosting: Explicit Navigation Ownership and a Policy-Capable Shell

## Status

**Accepted** — scope directed by the owner (2026-09-12, this task's
instruction) as the successor decision ADR-0018's revisit trigger requires
("a production use case requires … SPA fallback (new decision required)").
This decision AMENDS [ADR-0018]; every contract ADR-0018 froze that this
decision does not explicitly amend remains frozen. The target is the
owner's production model: an already-built frontend and the typed API
served by **one Bun process**, with no development tooling in production.
No SSR engine, frontend compiler, Vite runtime integration, or
[ADR-0035] `app.fetch()` work is approved by this decision.

## Problem

ADR-0018 deliberately excluded navigation fallback: default-on SPA
fallback "destroys error distinguishability," and root catch-alls "entangle
API and asset ownership." That boundary is correct and stands. The gap is
narrower: a built single-page application needs a *deep-navigation* story —
refreshing `/app/projects/42` must return the application shell — without
HTML ever masking an API error, an asset miss, or a wrong-method request.
Applications currently solve this with per-project hosting glue, which is
precisely the drift this repository exists to remove.

## Decision

Introduce an **opt-in `spa` configuration** at the same Bun-serving
boundary as ADR-0018, with **application-declared ownership**:

1. **Explicit SPA-owned navigation patterns** (`navigations`): exact paths
   (`/app/projects/42`) or explicit prefixes (`/app/*`). There is no
   catch-all that guesses what the application meant, and no global
   `/api` or other prefix is reserved — ownership remains
   application-declared, exactly as ADR-0018 requires. Navigation
   ownership that overlaps any declared route, asset mapping, asset
   directory prefix, health endpoint, OpenAPI endpoint, or another
   navigation **fails closed at startup**.
2. **The shell is a policy-capable response path.** The HTML document is
   served by a framework handler returning a **lazy, file-backed**
   response (`Bun.file`), so it passes through the framework pipeline:
   security headers, CORS, and logging apply to `/` and to every deep
   navigation identically. Default cache policy for the shell is
   **revalidation** (`cache-control: no-cache`). This is an explicit
   contract choice answering the composition question ADR-0018 left
   open: native static values still bypass the pipeline (per #403's
   documented truth), so the shell must not be one.
3. **Explicitly identified content-hashed assets** may opt into
   long-lived caching through a new object form of `assets.files`
   (`{ path, cacheControl }`). These compile to file-backed handlers —
   still lazy, still Bun-served content types — so the immutable
   cache header and the pipeline compose. String-form file mappings and
   directory mounts keep their exact ADR-0018 semantics and headers
   (conservative: unchanged).
4. **Request-ownership table** (amending ADR-0018's table with the SPA
   rows):

| Request | Required behavior |
|---|---|
| Existing API route | Existing dispatch, validation, guards, response semantics unchanged. |
| Missing route in an explicitly API-owned namespace | API not-found response — even when the request accepts HTML. |
| Existing public asset | Correct file contents and native HTTP behavior (unchanged from ADR-0018). |
| Missing asset under an asset-owned prefix | Asset 404, never `index.html`. |
| Eligible GET navigation in an explicitly SPA-owned area | Serve the application shell. |
| HEAD on a navigation | Shell headers, no body. |
| Non-navigation methods on a navigation | Never a successful SPA shell (they fall through to the documented not-found outcome; no 405 promise). |

5. **Resource and platform constraints** (binding):
   - No runtime frontend build, watcher, or dev-server integration; the
     frontend is built before deployment.
   - No eager loading of frontend files into process memory: shell and
     hashed handlers return file-backed responses; `Bun.file` is lazy.
     (This is not a zero-memory claim; it is the starting mechanism.)
   - No request-path filesystem scanner and no Lugas MIME implementation:
     hashed assets are exact mappings (a build step — e.g. the
     application's bundler pipeline — can generate the mapping); serving
     and content types stay delegated to Bun.
   - Native directory mounts remain Linux-only per ADR-0018's amendment;
     nothing in this decision replaces that restriction with a Lugas
     directory walker.

## Non-goals

- No SSR, no frontend compilation, no Vite/watcher integration, no
  `app.fetch()` (ADR-0035 remains design-only under ODR-0018/ODR-0019).
- No change to ADR-0018's native asset semantics, method policy for
  assets, containment requirements, or disclosure classification.
- No Accept-header sniffing: ownership is decided by configuration
  matching alone, so behavior is deterministic for every client.
- No automatic cache hashing/fingerprinting by Lugas.

## Consequences

- Positive: the owner's one-process production model becomes a supported,
  tested shape; API/asset/SPA error distinguishability is preserved by
  construction (ownership fails closed).
- Cost/tradeoff: two new diagnostics (`LUGAS_SPA_001/002`), one more
  config surface; accepted because the alternative is per-project glue.
- Compatibility: absent `spa` configuration, behavior is unchanged
  bit-for-bit; string-form `assets.files` unchanged; the new object form
  is additive.

## Evidence

Implementation lands with the ownership table as acceptance tests: API
miss (with and without `Accept: text/html`), asset miss under a mounted
prefix, shell at `/` and a deep navigation with identical security/cache
headers (with `secureHeaders` configured), HEAD bodylessness, wrong-method
fall-through, hashed-mapping cache headers, native string files unchanged,
and startup failure on every ownership overlap. Performance evidence
(API-only vs API-plus-SPA launch/readiness, idle RSS, asset-workload
memory) is a separate measurement task for the starter milestone — not
claimed here.

## Revisit trigger

Bun changes file-response or method-map semantics within the supported
1.4.x line; a production requirement demands prefix-scoped hashed serving
without a build-time mapping; or evidence shows the shell handler path
must bypass the pipeline for performance — amend before changing.
