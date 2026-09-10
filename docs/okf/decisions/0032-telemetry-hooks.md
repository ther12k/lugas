---
type: Architecture Decision Record
title: 'ADR-0032 — Dependency-Free Telemetry Hooks'
status: accepted
tags:
- adr
- architecture
- telemetry
- opentelemetry
- '0032'
generated:
  by: zcode/glm
  at: '2026-09-10T00:00:00+07:00'
---

# ADR-0032 — Dependency-Free Telemetry Hooks

## Status

Accepted by owner decision (ODR-0015, `docs/owner-decisions/m9-006-dispatch.md`, 2026-09-10), dispatching issue [#376](https://github.com/ther12k/lugas/issues/376) (M9-006). Second item of (d), the final planned battery group of the ODR-0010 sequence. The owner's constraint: an OpenTelemetry **hook surface, not an SDK dependency**.

## Context

Structured logging (ADR-0024) already gives Lugas a scalar-only event stream with a pluggable sink, and its doc notes the OpenTelemetry adaptation point. What logging cannot express is the **span lifecycle**: when a request's work *ends* — including work the handler detached through `track()` (ADR-0020) — and what error class surfaced. An application adopting `@opentelemetry/api` today hand-wraps every route or accepts spans that end when the handler returns, silently excluding tracked work and misattributing 500s.

The pull in the wrong direction is adopting OTel SDKs in the framework: a hard dependency tree, context-propagation globals that fight the application's own instrumentation, and version churn — precisely the "OTel dependency" the roadmap's parenthetical excludes. The framework's honest contribution is the same one ADR-0024 made for logs: **emit the facts, own the redaction, let the application ship.**

The zero-production-dependency rule and scalar-field redaction discipline carry over as hard constraints; the lifecycle's `track()` set already defines the correct request-end boundary (the drain waits for it), so telemetry can observe the same truth instead of inventing a second one.

## Decision

1. **`defineApp({ telemetry })`** — opt-in app-level telemetry hooks over the existing pipeline, compiled once at `defineApp()` like logging/CORS:
   - Config: `{ onRequestStart?: (event) => void; onRequestEnd?: (event) => void }` — explicit callbacks, not an emitter object.
   - **`request.start`**: `method`, `path`, `route` (the route id), `requestId` (present when `logging.requestIds` is enabled — one identity source, no second id).
   - **`request.end`**: adds `status`, `durationMs`, and `errorClass` when the error policy produced the response (`"handler" | "guard" | "framework" | "not-found"`).
   - Scalar-only fields, redaction by construction: headers, bodies, cookies, params, and query never appear — the ADR-0024 field discipline, extended to telemetry.
2. **Request-end boundary = the lifecycle boundary.** `request.end` fires when the response is produced **and** any work the request registered through `track()` has settled — the same set the drain waits on. Tracked work is correlated by passing the request's telemetry event identity to `track()` (a simple correlation token; no async-context magic, no globals).
3. **Span export is application-owned.** `docs/telemetry.md` ships a tested `toOpenTelemetry()` adapter recipe mapping the two events onto `@opentelemetry/api` span start/end (devDependency for the test/example only — never a runtime dependency). The application brings its own exporter, sampler, and propagation; the framework provides facts.
4. **Fail-closed config:** invalid telemetry config (non-function callbacks, unknown keys) throws `LUGAS_TELEMETRY_001` at `defineApp()`.
5. **Non-goals:** no bundled exporter/agent, no W3C `traceparent` propagation (an application guard reads it when needed — propagation policy belongs to the app), no metrics histograms (the events are the surface; an application reducer builds histograms), no async-context `AsyncLocalStorage` magic for implicit correlation.
6. **Packaging:** additive root config key + type exports; `package.json` untouched except the devDependency for tests/example (`@opentelemetry/api`, test-only — same pattern as `drizzle-orm` in ADR-0026).
7. **Diagnostics:** `LUGAS_TELEMETRY_001` (invalid telemetry configuration) — catalogued; goldens regenerated with the reason recorded.

## Consequences

- Positive: OTel-adopting applications get correct spans — including tracked work and error-class attribution — with a ~20-line adapter and zero framework weight for everyone else.
- Positive: one request-id and one request-end boundary across logging, telemetry, and the drain — no drift between observability surfaces.
- Cost/tradeoff: two callbacks, not an emitter/`EventEmitter` surface — deliberate minimality; richer订阅 (subscriptions) can be userland sugar over the same two events.
- Cost/tradeoff: no automatic parent/child span context propagation — the recipe wires context explicitly; implicit propagation would require globals the framework refuses.
- Compatibility effect: one additive config key; the pipeline gains a wrap beside logging (innermost of the policy wraps).

## Alternatives considered

- **Depending on `@opentelemetry/api` in the framework core:** rejected — violates the zero-dependency rule for a benefit achievable with facts + a recipe; OTel API version churn becomes Lugas churn.
- **Reusing the logging sink with new entry kinds (`kind: "request.start"`):** rejected as the primary surface — log level filtering would gate telemetry, and sinks written for logs would receive span events they never asked for; telemetry gets its own callbacks. (The ADR-0024 sink note stays as the *log* adaptation point.)
- **An `EventEmitter`/hook-bus object:** rejected — a second subscription vocabulary with listener lifecycle questions; two named callbacks are statically searchable and exhaustively typed.
- **`AsyncLocalStorage`-based implicit correlation:** rejected — globals and async-context plumbing contradict explicitness; the correlation token is a plain value the application controls.
- **Waiting for OTel stabilization / doing nothing:** rejected for now — the events are framework truth (route, status, duration, error class) regardless of where OTel goes; emitting them loses nothing if the ecosystem shifts.

## Evidence

Implementation issue [#376](https://github.com/ther12k/lugas/issues/376) (M9-006) delivers behavior tests (event fields across success/guard/framework/redacted-500 paths, tracked-work boundary, redaction suite, config diagnostics), the `toOpenTelemetry()` recipe test against `@opentelemetry/api`, `docs/telemetry.md`, and `examples/telemetry/`; evidence report `docs/reports/issues/M9-006.md`.

## Revisit trigger

If applications demonstrate a need for child spans around guard execution or per-service init phases, extend the event set by ADR amendment — the two-event surface is a floor, not a ceiling. If OTel's Web/HTTP semantic conventions stabilize a server span shape, the recipe updates (documentation, not framework).
