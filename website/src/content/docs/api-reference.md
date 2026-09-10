---
title: "API reference"
description: "Public API reference."
---
## Root subpath (`lugas`)

| Export | Kind | Status |
|---|---|---|
| `defineApp(config)` | function | stable |
| `defineModule(config)` | function | stable |
| `route(config)` | function | stable |
| `guard(config)` | function | stable |
| `service(config)` | function | stable (M7-004) |
| `drizzleService(config)` | `lugas/drizzle` function | new (M9-001) |
| `parseCookies(request)` | function | new (M9-002) |
| `cookie(name, value, attrs?)` | function | new (M9-002) |
| `websocket(config)` | function | new (M9-003) |
| `secureHeaders` / `health` | `defineApp()` config | new (M9-004) |
| `form(config)` | body codec function | new (M9-005) |
| `telemetry` (`onRequestStart`/`onRequestEnd`) | `defineApp()` config | new (M9-006) |
| `sse(config)` | function | new (M8-002) |
| `formatSseEvent(input)` | function | new (M8-002) |
| `json(status, data)` | function | stable |
| `text(status, body)` | function | stable |
| `empty()` | function | stable |
| `problem(status, fields)` | function | stable |
| `redirect(location)` | function | stable |

Types: `AppConfig`, `LugasAppInstance`, `ModuleConfig`, `RouteConfig`, `GuardConfig`, `ServiceConfig`, `ServiceDescriptor`, `LugasLifecycle`, `ShutdownOutcome`, `ShutdownOptions`, `CorsConfig`, `CorsOriginDecision`, `CorsOriginInput`, `SseConfig`, `SseWriter`, `SseEventInput`, `CookieAttrs`, `WebSocketConfig`, `WebSocketEventContext`, `WebSocketMessage`, `ServerWebSocketLike`, `SecureHeadersConfig`, `HealthConfig`, `FormConfig`, `FormDescriptor`, `MultipartBody`, `TelemetryConfig`, `TelemetryRequestStart`, `TelemetryRequestEnd`, `TelemetryErrorClass`, `LoggingConfig`, `LugasLogEntry`, `LugasLogFields`, `LugasLogLevel`, `LogSink`, `OpenApiConfig`, `OpenApiDocumentInfo`, `OpenApiRouteMetadata`, `OpenApiUiConfig`, `CompiledOpenApi`, `ProblemFields`, `RedirectStatus`, `TypedResponse`, `AppContract`

`defineApp()` also accepts `assets` (opt-in, ADR-0018): `{ files: { "/robots.txt": "./public/robots.txt" }, dirs: { "/assets/*": "./public/assets" } }`. File mappings are literal exact paths; directory mounts are explicit prefixes ending in `/*`. Native directory mounts (`assets.dirs`) are supported on Linux only (relying on kernel `openat2(RESOLVE_IN_ROOT)` for symlink containment); configuring `dirs` on macOS or Windows fails closed before startup (`LUGAS_ASSET_004`). File mappings (`assets.files`) are supported across all platforms. Assets are served natively by Bun through GET/HEAD; other methods reach the app's not-found policy (no 405). Ownership conflicts with API routes are rejected at startup (`LUGAS_ASSET_002`). Asset routes are outside the manifest and the request pipeline (no guards, no `onError`).

### Body budgets (ADR-0019)

`defineApp({ bodyBudget })` sets an application default; `route({ budget })` sets a per-route override; both are byte counts clamped by `serve({ maxRequestBodySize })`. Budgets require a declared framework-parsed `body` (`LUGAS_BODY_002` otherwise) and above-ceiling configuration is rejected at `serve()` (`LUGAS_BODY_003`). Enforcement is bounded consumption ending in a `413` Problem Details response (`BODY_BUDGET_EXCEEDED`) before validation or handler execution; the transport ceiling's bare `413` is unchanged.

### CORS (ADR-0022)

`defineApp({ cors })` enables the first-party, opt-in, app-level CORS policy: `origin` (exact string, allowlist, `"*"`, or sync/async callback), `methods`, `allowedHeaders`, `exposedHeaders`, `credentials`, `maxAge`. When configured, every response carries `Vary: Origin`; allowed origins receive `Access-Control-Allow-Origin` (+ credentials/exposed headers as configured); preflights are answered `204` before application handlers (denied preflights get `204` with `Vary` only, so the browser fails them). Pipeline-bypass route kinds (static `Response`, `Bun.file`, `{ dir }`) and `assets` are rejected at startup when `cors` is configured (`LUGAS_CORS_004`). Absent `cors`, behavior is unchanged. Details: [`docs/cors.md`](/lugas/cors/).

### Cookies (ADR-0027)

`parseCookies(request)` parses the request's `Cookie` header per RFC 6265 into a plain `Record<string, string>` — lenient (malformed pairs skipped, duplicates last-wins), never throwing. `cookie(name, value, attrs?)` serializes a `Set-Cookie` entry (`httpOnly`, `secure`, `sameSite`, `path`, `domain`, `maxAge`, `expires`, `partitioned`) composing with the typed response helpers through `init.headers` as `[name, value][]` for multiple cookies. Serialization fails closed: invalid tokens throw `LUGAS_COOKIE_001`, invalid attribute combinations (`SameSite=None` without `Secure`, malformed attributes) throw `LUGAS_COOKIE_002`. No signing, session store, or auth surface. Details: [`docs/cookies.md`](/lugas/cookies/).

### WebSockets (ADR-0028)

`websocket({ before?, params?, query?, headers?, message, open?, close?, drain? })` declares a WebSocket route whose upgrade decision runs through the ordinary compiled pipeline: guards short-circuit the handshake with real HTTP responses, schema slots validate before the upgrade, and the ADR-0020 traffic gate holds upgrades during service init. Handlers receive Bun's native `ServerWebSocket` unwrapped plus the descriptor-derived context (`message` required). Non-upgrade requests get `426` Problem Details; `lugasLifecycle.shutdown()` closes open sockets with `1001 Going Away` before the drain; a custom `serve()` websocket option conflicts with declared routes (`LUGAS_WS_002`). Details: [`docs/websockets.md`](/lugas/websockets/).

### Telemetry hooks (ADR-0032)

`defineApp({ telemetry: { onRequestStart?, onRequestEnd? } })` — dependency-free request events: `request.start` (method, path, route, requestId when `logging.requestIds` is on) and `request.end` (+status, durationMs, errorClass), scalar-only and redacted by construction. Request-end includes `lugasLifecycle.track(task, request)`-correlated work (the drain boundary). The OpenTelemetry span adapter is a documented recipe (`docs/telemetry.md`); `@opentelemetry/api` is never a Lugas dependency. Details: [`docs/telemetry.md`](/lugas/telemetry/).

### Multipart forms (ADR-0030)

`body: form(config?)` is a bounded multipart body codec for the existing body slot: the raw body is read stream-wise up to the effective body budget (Content-Length refused pre-read; overrun aborted at the cap — `413 BODY_BUDGET_EXCEEDED`), then parsed by the platform `FormData` implementation over the buffered bytes. `ctx.body = { fields, files }` with native `File` values, repeated names last-wins. Limits `maxFields`/`maxFiles`/`maxFileSize` reject with `413 FORM_LIMIT_EXCEEDED`; unparseable bodies with `400 MALFORMED_MULTIPART`; wrong media type with `415`. Invalid limits fail closed (`LUGAS_FORM_001`). Details: [`docs/uploads.md`](/lugas/uploads/).

### Production hardening (ADR-0029)

`defineApp({ secureHeaders })` applies a conservative, fill-if-absent security-header policy to every pipeline response — defaults `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`; `contentSecurityPolicy` (explicit string) and `hstsMaxAge` are strictly opt-in, never defaulted. `defineApp({ health })` mounts `GET /health` (liveness — bypasses the traffic gate, answers 200 from boot onward) and `GET /ready` (readiness — 503 while init is pending or after startup failure, 200 once every service init settles); paths renamable, collisions fail closed (`LUGAS_HEALTH_002`). Details: [`docs/production.md`](/lugas/production/).

### Server-Sent Events (ADR-0023)

`sse({ start, heartbeatMs? })` returns a streaming `text/event-stream; charset=utf-8` response (`Cache-Control: no-cache`). `start(writer)` runs synchronously and may return a cleanup function that runs **exactly once** when the stream ends — `writer.close()`, client disconnect, or server force-close. The writer offers `send({ data, event?, id?, retry? })` (JSON-serializable data; `false` after end), `comment`, `retry`, `close`, and a `desiredSize` backpressure readout. The frame serializer is exported as `formatSseEvent`. Throwing `start` surfaces as a redacted `500` problem; diagnostics `LUGAS_SSE_001`/`LUGAS_SSE_002`. No broker, fan-out, or replay; `last-event-id` is an application concern. Details: [`docs/sse.md`](/lugas/sse/).

### Structured Logging (ADR-0024)

`defineApp({ logging })` configures structured logging with an explicit sink contract: `level` (default "info"), `sink` (pluggable `(entry) => void`), `requestIds` (`x-request-id` header + correlated id), and `access` (per-request entry). Scalar-only fields ensure redaction by construction: bodies, headers, and cookies are never logged by the framework. Details: [`docs/logging.md`](/lugas/logging/).

### OpenAPI 3.1 and Scalar (ADR-0025)

`defineApp({ openapi })` generates a canonical OpenAPI 3.1 document from routing facts and declared schemas, served as JSON at `path` (default `/openapi.json`), with an optional zero-dependency Scalar CDN HTML shell at `ui.path` (default `/docs`). Standard JSON Schema is feature-detected (`~standard.jsonSchema`); validators without a representation document structure only (never guessed shapes). RFC 9457 Problem Details is documented as the standard error component. `route({ openapi })` adds per-route metadata (summary, tags, operationId, responses). Path collisions with routes or assets are rejected at startup (`LUGAS_OPENAPI_002`). Details: [`docs/openapi.md`](/lugas/openapi/).

### Drizzle integration (ADR-0026, `lugas/drizzle`)

`drizzleService({ db, name, closeOnDispose? })` declares an application-owned Drizzle instance as a Lugas service: structural startup validation (`LUGAS_DRIZZLE_001`), typed `ctx.services.<name>` access with the exact instance type, deterministic lifecycle participation, and opt-in dispose through the structural `$client.close()` (`LUGAS_DRIZZLE_002` when not closable). No implicit I/O, no migrations, no transaction wrapping; the adapter never imports drizzle-orm. Details: [`docs/drizzle.md`](/lugas/drizzle/).

### Service lifecycle (ADR-0020)

`service()` attaches lifecycle behavior to one entry of `defineApp({ services })`:

```ts
import { defineApp, service } from "lugas";

defineApp({
  services: {
    db: service({
      name: "db",
      value: createDb(),
      init: async (db) => { await db.connect(); },
      dispose: async (db) => { await db.close(); },
    }),
  },
});
```

- `init` runs at serve time in declaration order (the `services` object key order) and **no Lugas handler executes before every `init` has settled**; requests arriving early are held. A startup failure disposes already-initialized services in reverse and surfaces through `server.lugasLifecycle.ready` (rejection) plus a redacted `503` on held routes. Plain (non-`service()`) values keep today's live-reference behavior and are never initialized or disposed.
- `server.lugasLifecycle.shutdown()` is idempotent and runs: stop accepting → drain in-flight requests **and** tasks registered through `track()` under a deadline (`serve({ shutdown: { drainDeadlineMs } })`, default 10s) → reverse-order disposal. Three outcomes are reported distinctly (`connectionsClosed`, `trackedWorkCompleted`, `disposalCompleted`) plus `disposalFailures`.
- **Deadline invariant:** when the deadline expires with work remaining, the outcome is unsuccessful (`cooperated: false`, `deadlineExpired: true`); connections are force-closed but services possibly still in use are **not** disposed — continuing work observes an intact resource, never fabricated success. The guarantee covers tracked work only; detached work is the application's responsibility.
- Signals are opt-in: `serve({ shutdown: { signals: true } })` handles SIGINT/SIGTERM through the same shutdown path. Importing Lugas installs no handlers and never exits the process.
- Raw/native route values (plain functions, `Response`, `Bun.file`, `{ dir }`) and asset routes bypass the framework pipeline and are therefore not lifecycle-gated.

## Client subpath (`lugas/client`)

| Export | Kind | Status |
|---|---|---|
| `createClient(options)` | function | stable |
| `parseResponse(response)` | function | stable |
| `interpolatePath(template, params)` | function | stable |
| `serializeQuery(query)` | function | stable |
| `appendQuery(path, qs)` | function | stable |
| `buildRequestInit(opts)` | function | stable |
| `normalizeBaseUrl(url)` | function | stable |
| `joinUrl(base, path)` | function | stable |
| `CLIENT_HTTP_METHODS` | const | stable |
| `ClientPathError` | class | stable |
| `ClientQueryError` | class | stable |
| `ClientRequestError` | class | stable |
| `ClientDecodeError` | class | stable |

Types: `LugasClient`, `ClientConfig`, `MethodCallInput`, `ClientCallResult`, `ClientSuccess`, `ClientFailure`, etc.

## Testing subpath (`lugas/testing`)

| Export | Kind | Status |
|---|---|---|
| `createTestServer(app, options?)` | function | stable |

Types: `TestServer`, `TestServerOptions`

## Deprecation policy (0.x)

During 0.x, breaking changes may occur between minor versions.
Deprecations require one minor release notice before removal.
No semver guarantee until 1.0.0.
