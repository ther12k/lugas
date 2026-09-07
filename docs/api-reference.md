# Lugas API Reference (v0.1.0-beta.1)

## Root subpath (`lugas`)

| Export | Kind | Status |
|---|---|---|
| `defineApp(config)` | function | stable |
| `defineModule(config)` | function | stable |
| `route(config)` | function | stable |
| `guard(config)` | function | stable |
| `json(status, data)` | function | stable |
| `text(status, body)` | function | stable |
| `empty()` | function | stable |
| `problem(status, fields)` | function | stable |
| `redirect(location)` | function | stable |

Types: `AppConfig`, `LugasAppInstance`, `ModuleConfig`, `RouteConfig`, `GuardConfig`, `ProblemFields`, `RedirectStatus`, `TypedResponse`, `AppContract`

`defineApp()` also accepts `assets` (opt-in, ADR-0018): `{ files: { "/robots.txt": "./public/robots.txt" }, dirs: { "/assets/*": "./public/assets" } }`. File mappings are literal exact paths; directory mounts are explicit prefixes ending in `/*`. Assets are served natively by Bun through GET/HEAD; other methods reach the app's not-found policy (no 405). Ownership conflicts with API routes are rejected at startup (`LUGAS_ASSET_002`). Asset routes are outside the manifest and the request pipeline (no guards, no `onError`).

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
