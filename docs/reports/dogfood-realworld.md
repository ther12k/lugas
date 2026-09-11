---
type: Evidence Report
title: Dogfood Realworld Reference App — 0.1.0 Stabilization
status: complete
tags:
- evidence
- dogfood
- stabilization
- stop-rule
---

# Dogfood: Realworld Reference App

Scope: build one reference application composing every shipped capability
using **only public exports as documented**, record every friction point
honestly, and fix only documentation-level issues. No framework code was
touched; anything that looked like it needed a new API was recorded as
post-0.1.0 feedback, per the ODR-0018 stop-rule lanes (documentation and
evidence upkeep).

## Outcome

- `examples/realworld/` — app.ts (all capabilities), server.ts, client.ts
  (typed-client smoke printing `REALWORLD-CLIENT-OK`), README.md.
- `tests/integration/realworld.test.ts` — 13 integration tests, all passing;
  the suite is now part of the ordinary `bun test` gate.
- Documentation corrections (this PR): `docs/services.md` opening example
  corrected; `docs/openapi.md` Scalar-UI comment clarified.
- Friction findings recorded in
  [`docs/reports/dogfood-realworld-findings.md`](dogfood-realworld-findings.md).

## What was composed (all verified live)

Drizzle service (Bun SQLite, `closeOnDispose`), Standard Schema validation
across all four slots with coercion/defaults, cookie session guard,
Problem Details 404/409/422, SSE stream with live events + heartbeat +
deterministic cleanup, WebSocket presence with query-token guard, bounded
multipart upload (201 and 413 paths), structured access logging with request
IDs, `/health` + `/ready`, secure headers, OpenAPI 3.1 + Scalar UI, and the
typed client driving the whole API from the app type.

## Commands and results

- `bun run examples/realworld/server.ts` — serves on :3000.
- `curl` passes: health, list, login (Set-Cookie HttpOnly), me, create (201,
  `id` present), invalid body (422 `VALIDATION_FAILED`), duplicate email
  (409), 404 problem, avatar upload (201 + 413 `FORM_LIMIT_EXCEEDED`),
  `/openapi.json` (8 paths), `/docs` (200), logout revocation (401 after).
- SSE: `retry: 3000`, `event: connected`, live `event: user.created` during
  POST; cleanup on abort.
- WS: unauthenticated upgrade rejected before any frame; two-session
  presence shows `{join}` / relayed message / `{leave}` (no self-echo — Bun
  pub/sub semantics).
- `bun run examples/realworld/client.ts` → `REALWORLD-CLIENT-OK`.
- `bun test tests/integration/realworld.test.ts` → 13 pass, 0 fail.
- `bun run typecheck` → clean (examples are in the typecheck scope).

## Assumptions

- In-memory session map is acceptable for a reference app (documented in the
  example README; real auth is Better Auth or an application store).
- Demo tolerates module-level SQLite state; the integration suite starts one
  server per file and runs sequentially like the existing suites.

## Known limitations

- The app deliberately keeps all data in memory (`:memory:` SQLite); restarts
  reset state.
- The typed client has no cookie jar — the smoke captures `Set-Cookie` with
  plain `fetch` and resends it via the routes' declared `cookie` header
  schema. This is by-design client behavior, recorded as RF-5 for docs.

## Deferred work

- All findings classified "API-shaped" (RF-1, RF-2, RF-3, RF-6) are
  post-0.1.0 candidates; none were implemented here.
- Website homepage polish was inspected: the splash layout already matches
  the intended design; no change required in this PR.

## Dependency/merge notes

- No dependency changes; examples typecheck within the existing scope.
- Merge order: standalone; no conflicts expected.
