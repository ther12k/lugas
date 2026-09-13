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
The tests skip when the starter is not set up; `LUGAS_REQUIRE_STARTER=1`
turns that skip into an explicit failure (CI posture).

`bun run measure` records the API-only vs API-plus-SPA comparison into
`measurements/` with the repaired (v2) harness: a monotonic timer from
before directly spawning the pinned Bun executable against the built
server, closed on a successful readiness response; server-process RSS
sampling; the real exit code; verified-and-consumed workload requests
timed separately from settling; and artifact identity by hash (tarball,
server bundle, frontend outputs, commit, dirty state, resolved deps).
Measurements to establish, not promised savings. The initial (v1)
artifact is marked SUPERSEDED — its readiness and RSS metrics are invalid
(harness defects; see `docs/reports/issues/CA-14.md`).

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
