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
| LUGAS_APP_002 | defineApp() | unknown config key | allowed keys: services, routes, modules, notFound, onError |
| LUGAS_APP_003 | defineApp() | 'modules' must be an array | wrap modules: modules: [defineModule(...)] |
| LUGAS_APP_004 | defineApp() | modules entry is not a descriptor | create modules with defineModule({ name, routes }) |
| LUGAS_APP_005 | defineApp() | duplicate module name | module names must be unique within an app |
| LUGAS_APP_006 | defineApp() | 'routes' must be an object keyed by full path | use string paths like "/users/:id" |
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
| LUGAS_ROUTES_001 | compose() | duplicate route across owners | remove one declaration; both owners named in message |
| LUGAS_ROUTES_002 | serve pipeline | unsupported entry under method key | use route(), native Response, functions, or {dir} |
| LUGAS_ROUTES_003 | serve pipeline | unsupported route entry shape | same shapes as LUGAS_ROUTES_002 |
| LUGAS_ROUTES_004 | path analysis | invalid route path | paths start with '/' and follow Bun syntax |

## Compatibility

- Codes are frozen API. Wording, hints, and context keys may evolve.
- New codes append within their family; families never share numbers.
- Machine output (`formatDiagnostic(err, "json")`) is golden-stable:
  `{ code, message, hint?, context? }` — no stack, no cause.

## Redaction rules

Context values are scalar identity facts only. Header values, bodies,
query strings, and service data are forbidden in messages, hints, and
context — enforced by review and the security suites.
