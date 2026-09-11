---
type: Architecture Decision Record
title: 'ADR-0035 — Application Fetch Interface (Proposed)'
status: proposed
tags:
- adr
- architecture
- fetch
- integration
- bridges
- '0035'
generated:
  by: zcode/glm
  at: '2026-09-11T23:20:00+07:00'
---

# ADR-0035 — Application Fetch Interface (Proposed)

## Status

**Proposed — design documentation only.** Sketched 2026-09-11 as the keystone
contract of the post-0.1.0 program adopted by ODR-0019
(`docs/owner-decisions/post-010-program-adoption.md`; "the application
framework for Bun"). Under the ODR-0018 stop-rule this ADR is
written, not dispatched: no implementation occurs before 0.1.0 stabilization
completes. Acceptance happens post-0.1.0 through a dispatch ODR that pins the
remaining open points (below) — in particular the server-independent disposal
shape.

## Context

The application layer is shipped through the M9 sequence (attested
`0.1.0-beta.4`): routing ([ADR-0004]/[ADR-0005]), validation ([ADR-0008]),
guards ([ADR-0011]), services and lifecycle ([ADR-0020]), wire-honest
responses and Problem Details ([ADR-0006]/[ADR-0010]), the typed client
([ADR-0009]), OpenAPI/Scalar ([ADR-0025]), WebSocket ([ADR-0028]), SSE
([ADR-0023]), logging ([ADR-0024]), security and health
([ADR-0019]/[ADR-0022]/[ADR-0029]/[ADR-0034]), and telemetry hooks
([ADR-0032]). What does not exist is the **integration boundary above it**:
the only way to execute a Lugas application is `serve()` — a real socket.

Every host that could embed Lugas in-process (TanStack Start catch-all server
routes, SvelteKit `+server.ts` files, Astro endpoints, test harnesses) speaks
one de-facto contract: `fetch(request: Request): Response | Promise<Response>`.
Today an embedder must either own a socket or reimplement dispatch, so every
project invents glue, and the glue drifts.

`defineApp` currently returns `{ manifest, prepared, serve }` — the compiled
route graph exists behind `serveApp(prepared, options)`, but no fetch-shaped
entry is exposed. The gap is one method wide.

## Proposed decision (pending acceptance)

1. **Expose the Application Fetch Interface**:
   `app.fetch(request: Request): Promise<Response>`. The public application
   model becomes `manifest`, `prepared`, `fetch`, `serve`. The input is a
   `Request` and nothing else — no string/URL/init overload
   ([ADR-0003]: embedders already hold a `Request`; the minimal signature is
   the standard one).
2. **Pipeline equivalence (the MUST invariant).** `fetch()` and `serve()`
   MUST execute the same route pipeline and produce equivalent HTTP
   semantics. `serve()` is an adapter around the pipeline `fetch()` exposes —
   never a second execution path, and never a `fetch()`-specific fast path.
3. **Equivalence is defined over HTTP-visible semantics**: status, headers,
   and body — including the framework-owned error behavior (404/405,
   body-budget 413, validation 422, redacted 500, CORS handling).
   Server-instance-derived facts (socket peer address, upgrades) sit outside
   the interface; if such a fact ever becomes HTTP-visible, it is
   host-supplied in-process or the feature declares the limitation.
4. **Readiness is identical to serving.** A `fetch()` arriving before service
   `init` settles is held, not rejected ([ADR-0020] traffic-gate semantics):
   init runs once, in declaration order, on first dispatch; a startup failure
   disposes already-initialized services in reverse and surfaces the redacted
   `503`. Callers never need `await app.prepared` to use `fetch()`.
5. **The host owns lifecycle.** `fetch()` installs no signal handlers, binds
   no socket, and never exits the process. Shutdown and disposal belong to
   the embedding host; disposal must remain reachable without constructing a
   server (open point below).
6. **Standard Web API only.** `Request` in, `Response` out. `Request.url` is
   authoritative: `fetch()` knows no mount prefix (`/api`, `/backend` — none
   of them), performs no prefix mapping, and introduces no `LugasRequest`.
   Prefix ownership is a bridge-side concern: a catch-all route forwards what
   it receives, and the typed client's `baseUrl` mirrors the same choice.
7. **The WebSocket upgrade boundary is explicit.** The fetch boundary covers
   HTTP, streaming responses, and SSE ([ADR-0023]). WebSocket upgrades
   ([ADR-0028]) are a separate, host/runtime-specific capability — Bun's
   upgrade path involves the server instance. This ADR claims no transparent
   WebSocket portability. Bridges advertise capability rows honestly: HTTP,
   cookies, streaming, SSE verified per host; WebSocket
   "depends on host/adapter".
8. **Certified bridges, not compatibility badges.** An integration may be
   called "supported" only with CI-generated evidence per capability — the
   `compatibility.yml` discipline extended to bridges ([ADR-0016]). A matrix
   row without a green run behind it is prohibited, including in READMEs.
9. **Packaging.** The interface is additive on the existing application
   object: no new dependencies; no export-map change beyond any first-party
   bridge subpaths, which — per the packaging direction recorded in
   [ODR-0019] — remain in-package (`lugas/tanstack-start`,
   `lugas/sveltekit`) following the [ADR-0026] structural-adapter precedent
   rather than new `@lugas/*` packages ([ADR-0012]).

## Consequences (if accepted)

- Positive: one primitive makes every host bridge thin glue. The TanStack
  Start sketch collapses to `({ request }) => app.fetch(request)` per method
  in a catch-all server route; SvelteKit to method re-exports from
  `+server.ts`. No generated SDK, no duplicate schema — the typed client
  ([ADR-0009]) types the other half of the wire.
- Positive: `serve()` keeps its contract bit-for-bit; the differential suite
  (below) becomes the regression gate protecting it.
- Positive: the one-process story — frontend host and API in one Bun process,
  no proxy, no CORS-for-same-origin, no duplicated ports or env — becomes a
  supported deployment shape rather than a workaround.
- Cost/tradeoff: the differential equivalence suite is a permanent release
  gate.
- Cost/tradeoff: hosting without a server needs a disposal entry not tied to
  `LugasServer` — a small public-surface addition pinned at acceptance.
- Compatibility effect: additive only; `defineApp` returns one more field;
  nothing existing changes.

## Non-goals

- No second pipeline and no fetch-specific fast path — that is the
  invariant's point.
- No mount-prefix or host awareness; no host detection of any kind.
- No WebSocket upgrade solution in this ADR; a future upgrade-portability
  decision amends this record.
- No runtime-neutrality claim: the signature is standard, the core remains
  Bun-only through 1.x ([ADR-0002]). This is not an edge or service-worker
  deployment claim.
- No middleware system, no per-route service injection, no new configuration
  surface.
- No implementation before 0.1.0 completion ([ODR-0018]).

## Alternatives considered

- **Ephemeral-socket embedding (`serve({ port: 0 })` plus a loopback proxy in
  the host):** rejected — an extra network hop, port and lifecycle coupling,
  divergent error semantics, and the multi-process story this program exists
  to remove.
- **Per-host application types (`LugasTanstackApplication`, …):** rejected —
  N maintenance surfaces behind a contract that is already universal;
  violates [ADR-0003]'s small explicit API.
- **Exposing the internal prepared graph for hosts to drive themselves:**
  rejected — leaks internals, freezes internal shapes, and creates exactly
  the second execution path the invariant forbids.
- **Accepting now and implementing under a stop-rule exception:** rejected by
  [ODR-0019] — weakening a stop-rule in the week it was recorded teaches the
  wrong lesson; the design is settled now, the code waits for 0.1.0.

## Open points pinned at acceptance

- **Disposal shape for in-process hosting:** today disposal hangs off
  `LugasServer.lugasLifecycle.shutdown()` ([ADR-0020]). A host that never
  serves needs drain-ordered disposal from the application object. The
  candidate shape is `await app.dispose()` reusing the existing
  drain/deadline/outcome vocabulary exactly — deliberately **not** a second,
  embedding-specific lifecycle model. Design guidance recorded by the owner
  (2026-09-11); to be answered by reusing current lifecycle semantics where
  possible, documented but not implemented during 0.1.0 stabilization:
  1. Who owns disposal?
  2. Can `dispose()` be called without `serve()` ever having been called?
  3. What happens to in-flight `app.fetch()` calls?
  4. Is disposal idempotent?
  5. Does the default drain deadline equal server shutdown's default?
  6. Does the outcome reuse the existing shutdown result shape exactly?

  Acceptance criterion: if all six are answerable by reusing ADR-0020
  semantics, the interface is safe to dispatch; if they require a parallel
  lifecycle abstraction, this ADR is amended or rejected before dispatch.
  The exact API is pinned in the dispatch ODR.
- **Bun-native handler mounting:** whether `fetch()` should also be reachable
  as a Bun route value (zero-copy mounting into another `Bun.serve`) — a
  possible free consequence of the shared pipeline, decided by implementation
  evidence, not promised here.

## Evidence

None yet — proposal stage; design-only under [ODR-0019]. On post-0.1.0
dispatch: a differential equivalence suite (`fetch` vs `serve` across the
error catalog, streaming, SSE, cookies, CORS), a no-socket test (dispatch
with zero listeners), readiness-hold tests over pending init, and bridge
conformance lanes in the certified compatibility matrix. Reference
documentation (`docs/fetch-interface.md`) ships with the implementation.

## Revisit trigger

Owner acceptance after 0.1.0 stabilization (dispatch ODR required). Material
changes — a standardized upgrade-through-fetch primitive, a host requirement
incompatible with `Request.url` authority, or a pipeline semantic that
provably cannot be reproduced in-process — amend this record before
acceptance.
