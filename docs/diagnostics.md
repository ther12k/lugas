---
type: Reference
title: Diagnostic Catalog and Formatting
status: stable
tags:
- diagnostics
- errors
- m4
---

# Lugas Diagnostic Catalog

Every framework-raised diagnostic carries a frozen code
(`LUGAS_<FAMILY>_<NNN>`), a message (wording may evolve), an optional
corrective hint, and optional scalar context (route, module, method, key).
Client-side codes `LUGAS_CLIENT_001`–`010` are defined in
`src/client/*` and documented in `docs/client-error-semantics.md`.

## Framework catalog

| Code | Thrown by | Meaning | Hint |
|---|---|---|---|
| LUGAS_APP_001 | defineApp() | config must be an object | pass defineApp({ routes }) with an object literal |
| LUGAS_APP_002 | defineApp() | unknown config key | allowed keys: services, routes, modules, assets, bodyBudget, cors, logging, notFound, onError |
| LUGAS_APP_003 | defineApp() | 'modules' must be an array | wrap modules: modules: [defineModule(...)] |
| LUGAS_APP_004 | defineApp() | modules entry is not a descriptor | create modules with defineModule({ name, routes }) |
| LUGAS_APP_005 | defineApp() | duplicate module name | module names must be unique within an app |
| LUGAS_APP_006 | defineApp() | 'routes' must be an object keyed by full path | use string paths like "/users/:id" |
| LUGAS_ASSET_001 | defineApp() assets | invalid asset configuration | files keys are literal exact paths; dirs keys are explicit prefixes ending in "/*" pointing at existing directories |
| LUGAS_ASSET_002 | defineApp() assets | ambiguous asset/API ownership | asset declarations and API routes must own disjoint paths; change one of them |
| LUGAS_ASSET_003 | defineApp() assets | asset declaration does not point at existing content | check the filesystem path (relative paths resolve from the process working directory) |
| LUGAS_ASSET_004 | defineApp() assets | native directory mounts unsupported on this platform | assets.dirs requires Linux with openat2(RESOLVE_IN_ROOT); use explicit assets.files on other platforms |
| LUGAS_LIFECYCLE_001 | service() | invalid service lifecycle descriptor | use service({ name, value, init?, dispose? }) with a non-empty name |
| LUGAS_BODY_001 | defineApp() / route() | invalid body budget configuration | budget must be a positive integer number of bytes |
| LUGAS_BODY_002 | defineApp() | body budget requires a declared framework-parsed body | declare a body schema on the route or remove the budget |
| LUGAS_BODY_003 | serve() | body budget above the configured server ceiling | an override relaxes the default, never the ceiling; lower the budget or raise maxRequestBodySize |
| LUGAS_CORS_001 | defineApp() | invalid cors configuration | allowed keys: origin, methods, allowedHeaders, exposedHeaders, credentials, maxAge |
| LUGAS_CORS_002 | defineApp() | invalid cors origin configuration | origin is a non-empty origin string, an allowlist without "*" mixing, "*" alone, or a function |
| LUGAS_CORS_003 | defineApp() | cors credentials incompatible with wildcard origin | browsers reject credentialed wildcard responses; list concrete origins (or use a callback returning true) |
| LUGAS_CORS_004 | defineApp() | cors combined with pipeline-bypass route kinds or assets | convert static values (Response, Bun.file, { dir }) to handlers or serve them from an app without cors |
| LUGAS_SSE_001 | sse() | invalid sse configuration | pass sse({ start(writer) { ... } }) with an optional positive heartbeatMs |
| LUGAS_SSE_002 | sse() writer | invalid SSE event input or non-serializable data | data is a string, number, boolean, null, or a JSON-serializable object; event/id/comment values are single-line |
| LUGAS_LOG_001 | defineApp() | invalid logging configuration | allowed keys: level, sink, requestIds, access; level is debug\|info\|warn\|error |
| LUGAS_MODULE_001 | defineModule() | config must be an object | pass defineModule({ name, routes }) |
| LUGAS_MODULE_002 | defineModule() | unknown config key | allowed keys: name, routes |
| LUGAS_MODULE_003 | defineModule() | 'name' must be a non-empty string | module names appear in manifests; use stable names |
| LUGAS_MODULE_004 | defineModule() | 'routes' must be an object keyed by full path | use string paths like "/invoices/:id" |
| LUGAS_MODULE_005 | defineModule() | duplicate method/path inside one module | each method+path declared once per module |
| LUGAS_ROUTE_001 | route() | config must be an object | pass route({ handler }) |
| LUGAS_ROUTE_002 | route() | unknown config key | allowed keys: handler, before, params, query, headers, body |
| LUGAS_ROUTE_003 | route() | 'handler' must be a function | handler receives validated context, returns Response |
| LUGAS_ROUTE_004 | route() | 'before' must be an array | list guards in execution order |
| LUGAS_ROUTE_005 | route() | 'before' entries must be guard() descriptors | create guards with guard({ name, handler }) |
| LUGAS_GUARD_001 | guard() | config must be an object | pass guard({ name, handler }) |
| LUGAS_GUARD_002 | guard() | unknown config key | allowed keys: name, handler |
| LUGAS_GUARD_003 | guard() | 'name' must be a non-empty string | guard names appear in manifests; use stable names |
| LUGAS_GUARD_004 | guard() | 'handler' must be a function | return Response to short-circuit or enrichment object |
| LUGAS_GUARD_005 | guard pipeline | guard result is not Response or plain object | return Response, {} for no enrichment, or a plain object |
| LUGAS_GUARD_006 | guard pipeline | enrichment overwrote framework-owned key | guards add new keys; never request/services/params/query/headers/body |
| LUGAS_GUARD_007 | guard pipeline | duplicate enrichment key across guards | each key produced by exactly one guard per route |
| LUGAS_ROUTES_001 | compose() | duplicate route across owners | remove one declaration; both owners named in message |
| LUGAS_ROUTES_002 | defineApp() | unsupported entry under method key | use route(), native Response, functions, or {dir} |
| LUGAS_ROUTES_003 | defineApp() | unsupported route entry shape | same shapes as LUGAS_ROUTES_002 |
| LUGAS_ROUTES_004 | path analysis | invalid route path | paths start with '/' and follow Bun syntax |
| LUGAS_RESPONSE_001 | json() | content-type override is not a JSON media type | json() owns application/json and application/*+json; omit the override or use text() |
| LUGAS_RESPONSE_002 | text() | content-type override is not a text media type | text() owns text/*; omit the override or use json() |
| LUGAS_RESPONSE_003 | problem() | content-type override is not application/problem+json | problem() owns application/problem+json (RFC 9457); omit the override or use json() |
| LUGAS_RESPONSE_004 | empty() | content-type override on a bodyless response | empty() owns no body; a response without a body cannot declare a content type |
| LUGAS_RESPONSE_005 | json() | body serializes to no JSON text | the body (or its toJSON result) is undefined; use empty() for a bodyless response |

## Compatibility

- Codes are frozen API. Wording, hints, and context keys may evolve.
- New codes append within their family; families never share numbers.
- Machine output (`formatDiagnostic(err, "json")`) is golden-stable:
  `{ code, message, hint?, context? }` — no stack, no cause.

## Redaction rules

Context values are scalar identity facts only. Header values, bodies,
query strings, and service data are forbidden in messages, hints, and
context — enforced by review and the security suites.
