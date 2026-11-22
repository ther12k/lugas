---
type: Roadmap
title: Lugas Roadmap
status: current
tags:
- roadmap
- beta
---

# Roadmap

## Beta surface (`v0.1.0-beta.1`)

| Capability | Status |
|---|---|
| Bun-native HTTP server | Available |
| Typed route declarations | Available |
| Root and module route composition | Available |
| Standard Schema validation | Available |
| Typed guards and context enrichment | Available |
| Status-discriminated, wire-honest responses | Available |
| RFC 9457 Problem Details | Available |
| End-to-end typed HTTP client | Available |
| Test-server helpers | Available |
| Static route manifest | Available |
| Route-inspection CLI | Available |
| OpenAPI and Scalar — shipped on `main` (M8-004, ADR-0025) | Available |
| CORS middleware — shipped on `main` (M8-001, ADR-0022) | Available |
| Server-Sent Events — shipped on `main` (M8-002, ADR-0023) | Available |
| Structured request logging — shipped on `main` (M8-003, ADR-0024) | Available |

Later batteries are listed below with their release status.

## Shipped first-party batteries

### OpenAPI 3.1 and Scalar — shipped on `main` (M8-004, ADR-0025)

Delivered as generation-first OpenAPI 3.1: the document is generated from route methods and paths, path parameters, request bodies, explicit route metadata (`route({ openapi })`), and schemas that expose the Standard JSON Schema interface (`~standard.jsonSchema`), feature-detected; validators without a JSON Schema representation document presence only, never a guessed shape. RFC 9457 Problem Details is documented as the standard error component. The document is served as JSON at `openapi.path` (default `/openapi.json`) and remains usable independently of any documentation UI. Scalar is the optional presentation layer: a zero-dependency HTML shell served at `ui.path` (default `/docs`) loading Scalar from its public CDN — OpenAPI JSON stays canonical, the UI is opt-in and replaceable, and production exposure is an explicit application choice. Reference: [`docs/openapi.md`](openapi.md). Part of the attested `v0.1.0-beta.1` candidate regenerated on `3edaae9` (M8-GATE).

### CORS — shipped on `main` (M8-001, ADR-0022)

Delivered as the app-level, opt-in `defineApp({ cors })` policy with the planned shape: explicit origin allowlists, callback-based origin decisions, preflight handling, exposed and allowed headers, credential configuration, `Vary: Origin` on every response, and stable configuration diagnostics (`LUGAS_CORS_001`–`004`). CORS will not default to a permissive wildcard policy — the safe default is **no cross-origin access unless the application explicitly enables it**. Reference: [`docs/cors.md`](cors.md). Part of the attested `v0.1.0-beta.1` candidate regenerated on `3edaae9` (M8-GATE).

### Server-Sent Events — shipped on `main` (M8-002, ADR-0023)

Delivered as the native response helper with the planned shape: correct `text/event-stream` headers, event IDs, named events, retry hints, comments and an opt-in heartbeat, the exported `formatSseEvent` serializer, `desiredSize`-aware streaming, and deterministic exactly-once cleanup when the connection closes (writer close, client disconnect, or server force-close). SSE belongs close to the core because it is an HTTP response primitive, not an infrastructure product — no broker, fan-out, or replay. Reference: [`docs/sse.md`](sse.md). Part of the attested `v0.1.0-beta.1` candidate regenerated on `3edaae9` (M8-GATE).

### Structured logging — shipped on `main` (M8-003, ADR-0024)

Delivered as the small sink contract and opt-in access log facility: structured JSON logs, scalar-only fields (redaction by construction), request IDs (`x-request-id`), method, path, route, response status, duration in milliseconds, stable diagnostic `LUGAS_LOG_001`, and configurable levels. Adapts cleanly to Pino, OpenTelemetry loggers, or any standard sink. Reference: [`docs/logging.md`](logging.md). Part of the attested `v0.1.0-beta.1` candidate regenerated on `3edaae9` (M8-GATE).

### Drizzle ORM integration — shipped in beta.3 (M9-001, ADR-0026)

Delivered as a structural, application-owned service adapter under the new `lugas/drizzle` subpath: `drizzleService({ db, name, closeOnDispose? })` composes the existing `service()` lifecycle and typed `ctx.services` contract; handlers keep the exact Drizzle instance type. The adapter never imports drizzle-orm (structural validation with `LUGAS_DRIZZLE_001`/`002`), performs no implicit I/O or migrations, wraps no transactions, and stays driver-agnostic (integration tests on Bun SQLite). Reference: [ADR-0026](./okf/decisions/0026-drizzle-integration.md), dispatch [ODR-0010](./owner-decisions/m9-001-dispatch.md).

## Post-beta.2 sequence (owner-directed, 2026-09-09)

After M9-001, the intended battery order is:

1. **Cookie primitives + auth interoperability** — shipped on `main` (M9-002, [#362](https://github.com/ther12k/lugas/issues/362); [ADR-0027](okf/decisions/0027-cookies-auth-interop.md), ODR-0011): `parseCookies()` + `cookie()` with fail-closed serialization and the Better Auth guard recipe in [`docs/cookies.md`](cookies.md).
2. **WebSockets** — shipped on `main` (M9-003, [#366](https://github.com/ther12k/lugas/issues/366); [ADR-0028](okf/decisions/0028-websockets.md), ODR-0012): `websocket()` routes with pre-upgrade guards and validation, native sockets, shutdown close-1001; [`docs/websockets.md`](websockets.md).
3. **Production hardening** — shipped on `main` (M9-004, [#369](https://github.com/ther12k/lugas/issues/369); [ADR-0029](okf/decisions/0029-production-hardening.md), ODR-0013): `secureHeaders` (conservative defaults, CSP strictly opt-in) and `health` (`/health`/`/ready` over the init gate); [`docs/production.md`](production.md).
4. **Observability and HTTP primitives** — multipart parsing with bounded consumption shipped on `main` (M9-005, [#372](https://github.com/ther12k/lugas/issues/372); [ADR-0030](okf/decisions/0030-multipart-forms.md), ODR-0014; [`docs/uploads.md`](uploads.md)); the rate-limit *contract* shipped on `main` (M9-008, [#382](https://github.com/ther12k/lugas/issues/382); [ADR-0034](okf/decisions/0034-rate-limit-contract.md), ODR-0017; [`docs/rate-limit.md`](rate-limit.md)) — fixed-window guard semantics over application-owned storage, closing this sequence per the owner's stop-rule. Compression/ETag shipped on `main` (M9-007, [#379](https://github.com/ther12k/lugas/issues/379); [ADR-0033](okf/decisions/0033-compression-etag.md), ODR-0016; [`docs/compression.md`](compression.md)). OpenTelemetry hooks shipped on `main` (M9-006, [#376](https://github.com/ther12k/lugas/issues/376); [ADR-0032](okf/decisions/0032-telemetry-hooks.md), ODR-0015; [`docs/telemetry.md`](telemetry.md)).

Each battery requires its own issue, ADR, and ODR before implementation. **First-party non-goals (standing):** JWT, password/OAuth/passkey authentication, email, queues, Redis/cron/S3/cache backends, GraphQL, payments, migrations tooling, ORM repository pattern, dependency-injection container. Once this sequence lands, the differentiator is the small API, strong typing, Bun-native performance, and unusually good release evidence — not the size of the feature checklist.

## Post-0.1.0 program: the application framework for Bun (ODR-0019, 2026-09-11)

The owner adopted the post-0.1.0 product direction: Lugas turns Bun primitives and ecosystem tools into one explicit, typed, evidence-backed application model (pillars: Explicit, Typed, Integrated, Evidenced). The ODR-0018 stop-rule is **not** superseded: work on this post-0.1.0 program is limited to design documentation and compatibility requirements until stabilization is complete. On that basis [ADR-0035](okf/decisions/0035-application-fetch-interface.md) (Application Fetch Interface, `app.fetch`) is proposed with the owner's core pins: `fetch()` and `serve()` MUST execute the same route pipeline with equivalent HTTP semantics; the host owns lifecycle; standard `Request`/`Response` with `Request.url` authoritative (no prefix awareness, no `LugasRequest`); the WebSocket upgrade boundary is explicitly host-specific; bridge support claims require CI-generated per-capability evidence.

Intended post-0.1.0 sequence (milestone IDs assigned at dispatch): (1) fetch interface + TanStack Start and SvelteKit bridges + the certified compatibility matrix; (2) `create-lugas` (a second package on deployment-boundary grounds; ADR-0012 amendment) + official starters; (3) Bun-native structural service adapters (`sqlService`/`redisService`/`s3Service` — the ADR-0026 precedent: adapters, not backends, no wrapper API); (4) OpenTelemetry successor architecture (internal instrumentation surface investigated before any ADR; ADR-0032 non-goals amended explicitly). Reference: [ODR-0019](owner-decisions/post-010-program-adoption.md).

## Proposed integration defaults

Once the planned integrations land, the intended defaults are:

| Capability | Proposed default |
|---|---|
| OpenAPI document | Explicitly enabled; starter may enable in development |
| Scalar UI | Development-only in starter; explicit in production |
| CORS | Disabled unless configured (shipped behavior) |
| SSE | Available per route (shipped behavior) |
| Access logging | Off unless configured — explicit production policy (shipped behavior; amends the earlier "concise development logging" proposal for the 0.x line, per ODR-0009) |
| Drizzle | Never initialized implicitly |

## Release status

- **Published:** npm's `beta` tag points to `0.1.0-beta.5`; `latest` points to `0.1.0-beta.4`. Beta.4 completed the M9 battery sequence; beta.5 corrected the packaged version stamp and consumer metadata. See the [changelog](../CHANGELOG.md) for release history.
- **Beta.5 verification is closed:** [ODR-0021](owner-decisions/beta5-verification-discharge.md) records the quiet-host follow-up. The publication-time evidence still records the original deferral under ODR-0020; it is not rewritten.
- **Candidate `0.1.0-beta.6`: packet attested, not yet published.** Qualification complete: stabilization fixes, four review rounds, and the hardening-plan P0 batch merged as PR [#441](https://github.com/ther12k/lugas/pull/441); full gate with strict starter/browser flags 1001 pass / 6 skip / 0 fail; package rehearsal 34/34; six-cell OS/Bun matrix green on the candidate content and `main`; and the release performance gate **executed and passed on the pinned baseline host** (quiet, performance profile: plain-static 120680 rps, plain-json 100543 rps, validated-post 59628 rps — all above target; typecheck 1282 ms within budget; no deferral). The attested packet is committed at `ecafad9` ([CHECKLIST.md](releases/beta/CHECKLIST.md), [RELEASE_PACKET.md](releases/beta/RELEASE_PACKET.md)); both identities bind to `8de2da4`. Remaining: the owner publication sequence (registry check, tag, `npm publish`, dist-tag moves) per the checklist — publication is owner-controlled.

The [ODR-0018 stop-rule](owner-decisions/m9-gate-closure.md) remains in effect through 0.1.0 stabilization: fixes, documentation, evidence upkeep, and release engineering only. The owner's re-attestation decision ([#330](https://github.com/ther12k/lugas/issues/330)) keeps the `2ed954d` set preserved unmodified as superseded history under [`releases/superseded/2ed954d/`](./releases/superseded/2ed954d/).
