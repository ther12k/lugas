---
type: Reference
title: SPA Hosting (Built Frontend + API in One Process)
status: current
tags:
- spa
- hosting
- assets
- adr-0037
---

# SPA hosting (ADR-0037)

`spa` serves an **already-built** frontend from the same Bun process as your
API: a policy-capable application shell at every navigation you declare,
with API and asset errors left fully distinguishable. It is the successor
decision ADR-0018 explicitly deferred — and its boundaries hold: no SSR, no
frontend compilation, no runtime build or watcher, no `app.fetch()`.

```ts
import { defineApp } from "lugas";

export default defineApp({
  routes: {
    "/api/hello": { GET: route({ handler: () => json(200, { hello: true }) }) },
  },
  assets: {
    files: {
      // Content-hashed build outputs: explicit long-lived caching (file-backed handler)
      "/assets/app-4f8a1b.js": { path: "./dist/assets/app-4f8a1b.js", cacheControl: "public, max-age=31536000, immutable" },
      "/robots.txt": "./dist/robots.txt",     // string form: unchanged native semantics
    },
  },
  spa: {
    shell: "./dist/index.html",              // the built application shell
    navigations: ["/", "/app/*"],            // application-declared SPA ownership
  },
});
```

## Ownership table

Ownership is **application-declared and fail-closed** — a navigation that
overlaps any route, asset mapping/mount, health endpoint, OpenAPI endpoint,
or another navigation rejects at startup (`LUGAS_SPA_002`). There is no
catch-all and no reserved global prefix.

| Request | Behavior |
|---|---|
| Existing API route | Existing dispatch, validation, guards, response semantics unchanged. |
| Missing route in an explicitly API-owned namespace | API not-found response — even when the request accepts HTML. |
| Existing public asset | Correct file contents and native HTTP behavior. |
| Missing asset under an asset-owned prefix | Asset 404, never `index.html`. |
| Eligible GET navigation in an SPA-owned area | The application shell. |
| HEAD on a navigation | Shell headers, no body. |
| Other methods on a navigation | Never a successful shell (not-found fall-through; no 405 promise). |

## Header ownership

- **The shell is a pipeline response** (a lazy, file-backed `Bun.file`
  handler): `secureHeaders`, `cors`, and `logging` apply to `/` and to every
  deep navigation identically — refreshing `/app/projects/42` receives the
  same security policy as `/`. Cache policy defaults to **revalidation**
  (`cache-control: no-cache`).
- **Object-form asset mappings** (`{ path, cacheControl }`) are also
  file-backed pipeline handlers, for content-hashed build outputs that need
  long-lived caching without giving up policy composition.
- **String-form file mappings and `dirs` mounts stay native** (ADR-0018
  semantics unchanged): Bun's MIME, validators, and misses — and, by
  documented truth, no pipeline headers.

## Constraints

- Build before deployment — Lugas performs no runtime frontend build
  (`spa.shell` must point at an existing file, `LUGAS_SPA_001` otherwise).
- No eager loading: shell and hashed handlers return file-backed responses;
  `Bun.file` is lazy. (Not a zero-memory claim — the starting mechanism.)
- No request-path filesystem scanner and no Lugas MIME implementation:
  hashed assets are exact mappings (your build step can emit the mapping);
  serving stays delegated to Bun.
- Native `assets.dirs` mounts remain Linux-only (ADR-0018 amendment);
  nothing here replaces that with a custom directory walker.

## Where next

- [Assets](./getting-started.md#serving-public-assets) — the underlying native asset serving (ADR-0018).
- [Production](./production.md) — secure headers composition with the shell.
- [Diagnostics](./diagnostics.md) — `LUGAS_SPA_001` / `LUGAS_SPA_002`.
