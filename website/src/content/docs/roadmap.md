---
title: "Roadmap"
description: "Shipped beta surface and planned first-party batteries."
---
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
| Drizzle ORM integration | Dispatched — [M9-001](https://github.com/ther12k/lugas/issues/357), ADR-0026/ODR-0010 |

Planned capabilities are **not part of `v0.1.0-beta.1`** unless a later release explicitly documents them as available.

## Planned first-party batteries

### OpenAPI 3.1 and Scalar — shipped on `main` (M8-004, ADR-0025)

Delivered as generation-first OpenAPI 3.1: the document is generated from route methods and paths, path parameters, request bodies, explicit route metadata (`route({ openapi })`), and schemas that expose the Standard JSON Schema interface (`~standard.jsonSchema`), feature-detected; validators without a JSON Schema representation document presence only, never a guessed shape. RFC 9457 Problem Details is documented as the standard error component. The document is served as JSON at `openapi.path` (default `/openapi.json`) and remains usable independently of any documentation UI. Scalar is the optional presentation layer: a zero-dependency HTML shell served at `ui.path` (default `/docs`) loading Scalar from its public CDN — OpenAPI JSON stays canonical, the UI is opt-in and replaceable, and production exposure is an explicit application choice. Reference: [`docs/openapi.md`](/lugas/openapi/). Part of the attested `v0.1.0-beta.1` candidate regenerated on `3edaae9` (M8-GATE).

### CORS — shipped on `main` (M8-001, ADR-0022)

Delivered as the app-level, opt-in `defineApp({ cors })` policy with the planned shape: explicit origin allowlists, callback-based origin decisions, preflight handling, exposed and allowed headers, credential configuration, `Vary: Origin` on every response, and stable configuration diagnostics (`LUGAS_CORS_001`–`004`). CORS will not default to a permissive wildcard policy — the safe default is **no cross-origin access unless the application explicitly enables it**. Reference: [`docs/cors.md`](/lugas/cors/). Part of the attested `v0.1.0-beta.1` candidate regenerated on `3edaae9` (M8-GATE).

### Server-Sent Events — shipped on `main` (M8-002, ADR-0023)

Delivered as the native response helper with the planned shape: correct `text/event-stream` headers, event IDs, named events, retry hints, comments and an opt-in heartbeat, the exported `formatSseEvent` serializer, `desiredSize`-aware streaming, and deterministic exactly-once cleanup when the connection closes (writer close, client disconnect, or server force-close). SSE belongs close to the core because it is an HTTP response primitive, not an infrastructure product — no broker, fan-out, or replay. Reference: [`docs/sse.md`](/lugas/sse/). Part of the attested `v0.1.0-beta.1` candidate regenerated on `3edaae9` (M8-GATE).

### Structured logging — shipped on `main` (M8-003, ADR-0024)

Delivered as the small sink contract and opt-in access log facility: structured JSON logs, scalar-only fields (redaction by construction), request IDs (`x-request-id`), method, path, route, response status, duration in milliseconds, stable diagnostic `LUGAS_LOG_001`, and configurable levels. Adapts cleanly to Pino, OpenTelemetry loggers, or any standard sink. Reference: [`docs/logging.md`](/lugas/logging/). Part of the attested `v0.1.0-beta.1` candidate regenerated on `3edaae9` (M8-GATE).

### Drizzle ORM integration — dispatched (M9-001, ADR-0026)

Accepted as a structural, application-owned service adapter under the new `lugas/drizzle` subpath: `drizzleService({ db, name, closeOnDispose? })` composes the existing `service()` lifecycle and typed `ctx.services` contract; handlers keep the exact Drizzle instance type. The adapter never imports drizzle-orm (structural validation with `LUGAS_DRIZZLE_001`/`002`), performs no implicit I/O or migrations, wraps no transactions, and stays driver-agnostic (integration tests on Bun SQLite). Reference: [ADR-0026](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0026-drizzle-integration.md), dispatch [ODR-0010](https://github.com/ther12k/lugas/blob/main/docs/owner-decisions/m9-001-dispatch.md).

## Post-beta.2 sequence (owner-directed, 2026-09-09)

After M9-001, the intended battery order is:

1. **Cookie primitives + auth interoperability** — shipped on `main` (M9-002, [#362](https://github.com/ther12k/lugas/issues/362); [ADR-0027](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0027-cookies-auth-interop.md), ODR-0011): `parseCookies()` + `cookie()` with fail-closed serialization and the Better Auth guard recipe in [`docs/cookies.md`](/lugas/cookies/).
2. **WebSockets** — shipped on `main` (M9-003, [#366](https://github.com/ther12k/lugas/issues/366); [ADR-0028](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0028-websockets.md), ODR-0012): `websocket()` routes with pre-upgrade guards and validation, native sockets, shutdown close-1001; [`docs/websockets.md`](/lugas/websockets/).
3. **Production hardening** — shipped on `main` (M9-004, [#369](https://github.com/ther12k/lugas/issues/369); [ADR-0029](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0029-production-hardening.md), ODR-0013): `secureHeaders` (conservative defaults, CSP strictly opt-in) and `health` (`/health`/`/ready` over the init gate); [`docs/production.md`](/lugas/production/).
4. **Observability and HTTP primitives** — multipart parsing with bounded consumption shipped on `main` (M9-005, [#372](https://github.com/ther12k/lugas/issues/372); [ADR-0030](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0030-multipart-forms.md), ODR-0014; [`docs/uploads.md`](/lugas/uploads/)); the rate-limit *contract* shipped on `main` (M9-008, [#382](https://github.com/ther12k/lugas/issues/382); [ADR-0034](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0034-rate-limit-contract.md), ODR-0017; [`docs/rate-limit.md`](/lugas/rate-limit/)) — fixed-window guard semantics over application-owned storage, closing this sequence per the owner's stop-rule. Compression/ETag shipped on `main` (M9-007, [#379](https://github.com/ther12k/lugas/issues/379); [ADR-0033](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0033-compression-etag.md), ODR-0016; [`docs/compression.md`](/lugas/compression/)). OpenTelemetry hooks shipped on `main` (M9-006, [#376](https://github.com/ther12k/lugas/issues/376); [ADR-0032](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0032-telemetry-hooks.md), ODR-0015; [`docs/telemetry.md`](/lugas/telemetry/)).

Each battery requires its own issue, ADR, and ODR before implementation. **First-party non-goals (standing):** JWT, password/OAuth/passkey authentication, email, queues, Redis/cron/S3/cache backends, GraphQL, payments, migrations tooling, ORM repository pattern, dependency-injection container. Once this sequence lands, the differentiator is the small API, strong typing, Bun-native performance, and unusually good release evidence — not the size of the feature checklist.

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

The framework implementation, compatibility matrix, clean-room review, package rehearsal, and candidate attestation are complete through the M7-GATE (`ae4e29f`), M8-GATE (`3edaae9`), beta.3 release integration (`f3c72e6`), and the beta.4 attestation of the full M9 battery sequence (`373418f`). **`lugas@0.1.0-beta.2` is published under npm `beta`** (source commit `7f08b16`, npm README logo fix). **`lugas@0.1.0-beta.3` is published under npm `beta`** (source commit `f3c72e6`, tarball `11d7033e…`, gate PASS with zero blocking failures; carries the M9-001 Drizzle battery). **`lugas@0.1.0-beta.4` is published under npm `beta`** (source/attestation commit `373418f`, tarball `6c31b498…`, gate PASS with zero blocking failures; carries the M9-002–M9-008 batteries; the `v0.1.0-beta.4` tag and GitHub prerelease carry the attested assets). `latest` remains `0.1.0-beta.2`; the move to beta.4 requires the owner's OTP — `npm dist-tag add lugas@0.1.0-beta.4 latest --otp=<code>` (ODR-0018). The owner's stop-rule is in effect (ODR-0018): through 0.1.0 stabilization, work is limited to fixes, documentation, evidence upkeep, and release engineering. The owner's re-attestation decision ([#330](https://github.com/ther12k/lugas/issues/330)) keeps the `2ed954d` set preserved unmodified as superseded history under [`releases/superseded/2ed954d/`](https://github.com/ther12k/lugas/tree/main/docs/releases/superseded/2ed954d/). npm publication, dist-tag moves, and new release candidates remain explicitly owner-controlled.
