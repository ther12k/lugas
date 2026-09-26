---
type: Issue Evidence Report
title: 'CA-22 — Review-Driven Defect Fixes: ETag Streaming/Validators, Lifecycle Slot Keys, serve() Ordering, Generated-Path Ownership, Multi-Serve Gate'
status: implemented
tags:
- evidence
- review
- etag
- lifecycle
- correctness
---

# CA-22 Evidence Report

## Baseline

- Base commit: `c0a51b2` (Merge pull request #434), branch `release/beta5-packet-assembly`.
- Bun version: 1.4.2 (x64 Linux, kernel 7.0.0-31-generic); TypeScript 7.0.2.
- Origin: owner-requested read-only framework review ("review our framework so far"),
  followed by "ok cntnue fix". No assigned issue; findings and reproductions were
  produced in-session before any code changed (review evidence: live probes below).
- Baseline gate on the untouched tree: `bun run verify` PASS (976 pass / 6 skip /
  0 fail; perf gate SKIP in development mode — no benchmark archive), Bun 1.4.2.

## Findings fixed (all reproduced live before fixing)

1. **SSE stall under `etag: true`** — `applyEtag()` awaited `response.arrayBuffer()`
   with no `text/event-stream` exclusion: an open `/events` SSE route did not
   deliver a response within 250 ms (control without `etag`: immediate 200).
   `src/internal/compression.ts`.
2. **Multi-serve traffic-gate clobber** — `serveApp()` unconditionally reset the
   shared `prepared.trafficGate`; serving an app a second time while a slow
   service `init` (400 ms) ran held an already-ready first server's requests
   (probe: fetch timed out at 150 ms; events showed the second init re-running).
   `src/internal/serve.ts`, `src/internal/prepared-app.ts`.
3. **Lifecycle value filed under `name`, not map key** — with
   `services: { database: service({ name: "db", … }) }`, a live handler observed
   `services.database === undefined` and a ghost `services.db` value.
   `src/internal/lifecycle.ts`, `src/internal/prepared-app.ts`.
4. **`serve()` started initialization before validation** — an above-ceiling
   budget (`LUGAS_BODY_003`) threw only after `init` had run; `dispose` never
   did (probe: `starts: 1, stops: 0`). `src/internal/serve.ts`.
5. **health/OpenAPI silent path shadowing** — `openapi.path: "/health"` with
   `health: true` was accepted: manifest carried two `GET /health` rows and the
   later health mount won at runtime, against the fail-closed ownership model.
   `src/internal/prepared-app.ts`.

## Outcome

1. `applyEtag` skips `text/event-stream` structurally (compression's twin skip).
2. `If-None-Match` uses RFC 9110 weak comparison: `W/` insignificant on either
   side — the emitted `W/"…"` now round-trips to 304 (probe: 200 → 304).
3. The 304 preserves the 200's `Cache-Control`/`Content-Location`/`Expires`/`Vary`
   and drops body-descriptive headers (probe: `cc: private, max-age=60`,
   `vary: Origin` present, `content-length` absent).
4. `LifecycleService` carries `slot` (the services-map key); initialization fills
   `slots[svc.slot]`. Probe: `{"atKey":"live","atName":null}`.
5. `serveApp()` order: WS-conflict check → budget-ceiling check → `startLifecycle`
   → gate hookup → `Bun.serve` (wrapped: a native serve failure rolls services
   back through `lifecycle.shutdown("serve-failure")` before rethrowing). Probe:
   `LUGAS_BODY_003` with `init ran: false`.
6. Generated owners cross-validate: the OpenAPI section checks health paths and
   the health section checks OpenAPI/UI paths (both directions close; probes:
   `LUGAS_OPENAPI_002` for explicit and default-path collisions).
7. The traffic gate starts unsettled exactly when lifecycle services exist, and
   `serveApp()` installs a gate only while unsettled: a settled gate is never
   reset (a failed one may be replaced by a retry serve). Probe: first server
   answered 200 during a second serve's 400 ms init, and stayed 200 after.

## Files changed

- Owned by this fix: `src/internal/compression.ts`, `src/internal/lifecycle.ts`,
  `src/internal/prepared-app.ts`, `src/internal/serve.ts`,
  `tests/compression/compression.test.ts`, `tests/lifecycle/lifecycle.test.ts`,
  `tests/production/production.test.ts`, `docs/compression.md`, `docs/services.md`,
  this report.
- Adjacent, untouched: `src/index.ts` (no export changes; `LifecycleService` is
  internal), package.json / bun.lock (pre-existing working-tree modification
  `@oven/bun-linux-x64` and untracked package-lock.json left as found).

## Acceptance mapping

| Finding | Regression test |
|---|---|
| SSE + etag | `compression > SSE responses carry no framework etag and stream untouched` |
| Weak validator round-trip | `compression > weak validators revalidate…` |
| 304 cache metadata | `compression > 304 preserves the 200's cache metadata…` |
| Slot key vs name | `lifecycle > resolved value lands under the map key when it differs from name` |
| serve() ordering | `lifecycle > serve() validation failures run before any service init` |
| Generated-path ownership | `production > health/openapi path collisions fail closed in both directions` |
| Multi-serve gate | `lifecycle > a second serve() never re-holds a ready server behind its own init` |

## Commands and results

- Targeted: `bun test tests/compression/compression.test.ts tests/lifecycle/lifecycle.test.ts tests/production/production.test.ts` — 44 pass / 0 fail (first run 41/3 exposed the gate's initial-state error in the fix itself; corrected, see Known limitations §1).
- Full gate: `bun run verify` — typecheck, 980+ tests, docs validator, diff, agent docs all PASS (perf gate SKIP: development mode, no benchmark archive — unchanged policy).

## Security considerations

- 304 header preservation copies only four allow-listed header names from the
  prior response; no new data leaves the process. ETag hashes remain SHA-1 over
  already-produced bytes (unchanged disclosure surface).
- Fail-closed posture strengthened twice: generated-endpoint shadowing now
  rejects at startup; a rejected `serve()` no longer runs application `init`.

## Known limitations / deferred work

1. **First iteration of the gate guard was itself wrong** — gating on
   `!trafficGate.settled` skipped the FIRST install (initial state was
   `settled: true`); three pre-existing tests (held-503/readiness-503) caught it
   immediately. Corrected by initializing `settled: lifecycleServices.length === 0`.
2. **Multi-serve with lifecycle services remains "one prepared graph, shared
   state"**: a second serve re-runs `init` on the same values and each server's
   shutdown disposes them (double dispose across servers). Documented in
   `docs/services.md`; a per-serve prepared-graph rebuild would be an ADR-level
   change and is deferred.
3. The `Bun.serve()` failure rollback path is defensive; no deterministic
   trigger was found on the pinned runtime, so it ships without a dedicated test.
4. Kernel-4.15 openat2 fail-open (M7-001, pre-existing security finding) is
   untouched here — host disposition still pending with the owner.

## Dependency/merge notes

- No public API, package, or lockfile changes; internal type `LifecycleService`
  gained a `slot` field (not exported). Diagnostics reused existing codes
  (`LUGAS_OPENAPI_002`, `LUGAS_BODY_003`, `LUGAS_WS_002`) — golden catalog
  untouched.
- Based on `release/beta5-packet-assembly` at `c0a51b2`; not yet committed (owner
  review first, per protected-branch practice).

## Working-tree state

- Modified by this fix: the owned files above.
- Pre-existing, untouched: `package.json` (`@oven/bun-linux-x64` dependency),
  untracked `package-lock.json`.
