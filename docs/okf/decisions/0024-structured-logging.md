---
type: Architecture Decision Record
title: ADR-0024 — Structured Logging as a Small Contract with an Opt-In Access Facility
status: accepted
tags:
- adr
- architecture
- logging
- observability
- '0024'
generated:
  by: zcode/glm
  at: '2026-09-09T00:00:00+07:00'
---

# ADR-0024 — Structured Logging as a Small Contract with an Opt-In Access Facility

## Status

Accepted by owner decision (ODR-0009, `docs/owner-decisions/m8-003-dispatch.md`, 2026-09-09), dispatching issue [#352](https://github.com/ther12k/lugas/issues/352) (M8-003). Fulfills the roadmap row "Structured logging — planned core facility".

## Context

Applications need to see what their server did: which routes ran, with what status, how long, and with what correlation id — and they need it in *their* log store, not the framework's console. Every existing structured logger (Pino, OpenTelemetry-aware loggers, platform shippers) already owns formatting, transport, and rotation. What Lugas owes is the opposite of a logging product: a **small, explicit sink contract** plus the framework-internal facts (route identity, status, duration, request id) that only the request pipeline can produce — emitted through the contract and never around it.

The compile boundary ([ADR-0022](0022-first-party-cors.md)) is again the leverage point: every compiled handler is a function Lugas wraps, so per-request timing and outcome capture adds no router machinery and no Bun coupling beyond what already exists.

Redaction is a design constraint, not a feature: the historical rule (diagnostics never embed payloads; M6R1-008 fallback parity) extends to logs — the safest logging default is a field schema that **cannot carry** a header, cookie, authorization value, body, or origin string.

## Decision

Lugas ships a **logging configuration with a sink contract** — `defineApp({ logging })`:

1. **Configuration:** `level` (`"debug" | "info" | "warn" | "error"`, default `"info"`), `sink` (`(entry) => void`, default: one JSON line per entry to the matching `console` method), `requestIds` (default `false` — per-request `crypto.randomUUID()`, set as `x-request-id` on responses and logged), `access` (default `false` — one info-level entry per request). Absent `logging`, behavior is byte-identical to today: no output, no headers, no observable wrapping.
2. **Entry contract:** `{ time: ISO-8601 string, level, message, fields?: Record<string, string | number | boolean | null> }` — scalar fields only, by construction. The sink is the **entire** adaptation surface for vendor loggers: a Pino adapter is `(entry) => pino[entry.level](entry.fields, entry.message)`. No logger class hierarchy, no plugin system.
3. **Access entries (opt-in):** fields `method`, `path` (actual request path), `route` (matched declaration pattern, `"-"` for fallback/unmatched), `status`, `durationMs`, and `requestId` when enabled. Emitted at `info`; suppressed when `level` is `"warn"` or `"error"`.
4. **Redaction by construction:** the field schema is scalar and closed; Lugas never logs request headers, cookies, authorization values, bodies, query strings, or origin strings — there is no API through which an application could make the *framework's* entries carry them. Applications logging inside their own handlers are outside this contract (their sink, their responsibility), which the documentation states.
5. **Enforcement points (compile boundary):** the logging wrapper sits inside the CORS wrapper and outside the traffic gate and error policy — so held `503`s and error `500`s are access-logged with honest end-to-end durations, while CORS preflights (intercepted before any handler) are not access-logged. The serve-time fetch fallback is wrapped identically. `x-request-id` is applied like any framework header (mutate-in-place, reconstruct on silent no-op).
6. **No vendor coupling:** no logging dependency enters the package (`package.json`/`bun.lock` untouched); no file or network sinks are shipped. Diagnostic codes (`LUGAS_LOG_001`) cover invalid configuration.
7. **Routing and manifest unchanged:** the wrapper is invisible to `lugas-manifest-v1`; no route kinds, no facts, no contract changes.

## Consequences

- Positive: request visibility (route, status, duration, correlation id) arrives with zero vendor lock-in and a redaction story that is structural rather than policy.
- Positive: the access facility reuses the compile-boundary wrapping pattern proven by ADR-0022 — one function layer, absent entirely when unconfigured.
- Cost/tradeoff: fields are intentionally impoverished (scalars only); structured payloads (e.g. per-route business events) remain the application logger's job.
- Cost/tradeoff: `access` defaults to **off** (explicit production policy, per the roadmap's integration-defaults table) — quiet by default means applications must opt in to see anything.
- Compatibility effect: additive config key plus type exports from the root subpath (protected-file change owned by the single M8-003 issue per ODR-0009).

## Alternatives considered

- Shipping a built-in logger with transports/rotation: rejected — logging-vendor binding, violates ADR-0003 minimality and the roadmap's "logger contract, not vendor" wording.
- Making access logging default-on in development (keying off `serve({ development })`): rejected — environment-dependent default output violates determinism; explicit config is auditable.
- Auto-instrumenting through a Bun plugin/interceptor instead of wrapper functions: rejected — ADR-0004 keeps Bun's router authoritative; the wrapper pattern already covers every dispatch path.
- Rich log-event types (nested fields, errors as objects): rejected for framework entries — scalar-only fields are the redaction guarantee; error details live in the existing redacted diagnostics.

## Evidence

Implementation issue [#352](https://github.com/ther12k/lugas/issues/352) (M8-003) delivers behavior tests (no-config identity, access coverage across descriptor/native/fallback/503/500, request-id echo and correlation, level gating, sink determinism) and diagnostics tests; evidence report `docs/reports/issues/M8-003.md`.

## Revisit trigger

If applications need framework-emitted warn/error entries (e.g. lifecycle disposal failures, asset rejections) routed through the same sink, a small amendment can add them level-gated. Child-logger context propagation and traceparent/W3C correlation need their own evidence-backed decision.
