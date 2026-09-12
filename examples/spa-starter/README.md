# Lugas SPA starter (Vite + React + Bun, one production process)

The reference application for [ADR-0037](../../docs/okf/decisions/0037-spa-hosting.md):
a **built** Vite + React frontend and a typed Lugas API served by **one Bun
process** — no development tooling in production, no hosting glue in the app.

```
Build:  vite build → dist/          bun build → dist-server/main.js
Runtime: one Bun process
          ├── typed API (/api/*)
          ├── hashed assets (/assets/*, immutable cache, file-backed)
          └── SPA navigation fallback (/, /app/*, policy-capable shell)
```

## Run it

```bash
bun run setup   # pack this lugas checkout → install into the starter (consumer truth)
bun run build   # vite build → regenerate asset manifest → bundle the server entry
bun run start:built
# → http://localhost:3000  (deep-refresh http://localhost:3000/app/projects/42)
```

`bun run verify` runs the whole chain (setup → build → typecheck → tests).
`bun run measure` records the API-only vs API-plus-SPA comparison
(launch-to-readiness, idle RSS, RSS after an asset-request workload) into
`measurements/` — measurements to establish, not promised savings.

## What it demonstrates

- **Typed API**: validated mutation, guard-gated `/api/me`, framework failure
  branches (422/413) in the client result union — no casts.
- **Multipart through the typed client**: `formBody()` + `form({ repeated:
  "preserve" })`, last-wins `files` plus per-name `groups`.
- **Cookie auth, honestly**: login sets an httpOnly cookie; the browser
  manages it (same-origin requests carry it automatically) — no header
  plumbing through the typed client.
- **SSE**: `/api/events` consumed with the platform `EventSource` in the app.
- **Hosting contract**: shell at `/` and deep navigations with identical
  security/cache headers; API misses stay API 404s; asset misses never serve
  HTML; hashed assets carry long-lived caching generated from the Vite build
  manifest at build time.

## Frontend iteration

During development you can run `bunx vite` (the dev server) against a
separately started API — but the deployed shape is build-then-serve; Lugas
performs no runtime build and `vite preview` is not a production server.

## Notes

- The starter imports the **installed** `lugas` package
  (`file:lugas-starter.tgz`, refreshed by `bun run setup`) — never the
  repository checkout — so packaging and consumer-type failures surface here.
- Native `assets.dirs` mounts are Linux-only (ADR-0018 amendment); this
  starter uses explicit file mappings only, which are cross-platform.
