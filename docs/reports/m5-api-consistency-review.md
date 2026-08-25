---
type: Review Report
title: M5 API Consistency Review
status: complete
tags:
- review
- api-consistency
- m5
---

# M5 API Consistency Review

## Public symbol inventory

### Root (`lugas`)

| Symbol | Kind | Rationale | Example |
|---|---|---|---|
| `defineApp` | function | Sole app constructor; validates config, composes routes | examples/basic |
| `defineModule` | function | Feature-sliced route grouping | M4-002 |
| `route` | function | Typed route descriptor with derived context | examples/validation |
| `guard` | function | Ordered middleware with short-circuit/enrichment | examples/auth |
| `json`, `text`, `empty`, `problem`, `redirect` | functions | Explicit response constructors (no implicit returns) | examples/basic |

Types: `AppConfig`, `LugasAppInstance`, `ModuleConfig`, `RouteConfig`,
`GuardConfig`, `ProblemFields`, `RedirectStatus`, `TypedResponse`,
`AppContract` — all serve compile-time derivation.

### Client (`lugas/client`)

| Symbol | Kind | Rationale |
|---|---|---|
| `createClient` | function | Typed client factory; sole entry point |
| `interpolatePath` | function | Path building exposed for testing/debugging |
| `serializeQuery`, `appendQuery` | functions | Query building primitives |
| `buildRequestInit` | function | Request init construction |
| `parseResponse` | function | Response parsing primitive |
| `normalizeBaseUrl`, `joinUrl` | functions | URL composition helpers |
| `CLIENT_HTTP_METHODS` | const | Supported verb list |
| `ClientPathError`, `ClientQueryError`, `ClientRequestError`, `ClientDecodeError` | classes | Stable error types with codes |
| `CLIENT_DECODE_ERROR_CODE`, etc. | consts | Frozen diagnostic codes |
| Types: `LugasClient`, `Method*Input`, `ClientCallResult`, etc. | types | Compile-time contract surface |

### Testing (`lugas/testing`)

| Symbol | Kind | Rationale |
|---|---|---|
| `createTestServer` | function | Ephemeral server + typed client in one call |

## Consistency findings

| Area | Finding | Severity | Action |
|---|---|---|---|
| Route handler return type | Always `Response \| Promise<Response>` — no implicit returns | ✓ consistent | none |
| Guard return type | `Response` short-circuit or object enrichment — clearly separated | ✓ consistent | none |
| Error code families | `LUGAS_CLIENT_001–010`, `LUGAS_APP_001–006`, etc. — stable and documented | ✓ consistent | none |
| Client result shape | `{ ok, status, data/error, response }` — uniform across all methods | ✓ consistent | none |
| Manifest schema | `lugas-manifest-v1` — frozen with documented additive policy | ✓ consistent | none |
| Slot naming | params/query/headers/body used uniformly across server and client | ✓ consistent | none |
| No Proxy usage | Verified by source scan across all client modules | ✓ clean | none |
| No Eden dependency | Zero production runtime dependencies confirmed | ✓ clean | none |
| No hidden state | App instance is frozen; manifest is frozen; records are frozen | ✓ clean | none |
| No feature creep | No WebSocket, GraphQL, OpenAPI generation, or plugin system exists | ✓ clean | none |

## Elysia 2 lessons applied

1. **No Treaty clone**: Lugas's typed client uses discriminated results instead of chained promises.
2. **No lifecycle hooks on app**: Guards handle cross-cutting concerns; no global onRequest/onError.
3. **Explicit response constructors**: Unlike Elysia's implicit returns from handlers.
4. **Standard Schema over custom validator interface**: Compatible with any v1-compliant library.

## Proposed deletions

None required. All public symbols have clear admission rationale.

## Open decisions

None requiring owner action before alpha. ADR-0017 acceptance is pending at the gate level but does not affect API consistency.
