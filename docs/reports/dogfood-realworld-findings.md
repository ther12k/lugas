# Dogfood findings — realworld reference app (2026-09-11)

Friction observed while building `examples/realworld/` strictly from the
public docs. Classification: **docs** = fixed by documentation in this PR;
**API-shaped** = recorded as post-0.1.0 feedback, deliberately not
implemented under the ODR-0018 stop-rule.

| # | Finding | Class | Disposition |
|---|---|---|---|
| RF-1 | **Services typing has no inference path.** `docs/services.md`'s opening example (`handler: (ctx) => ctx.services.db…` with no type parameter) does not typecheck — `route()`'s `TServices` defaults to `unknown` and `defineApp` does not back-propagate the services map into route descriptors. The working patterns are an explicit `route<{ database: typeof db }>` type argument — which pins every other generic slot (`params`/`query`/`headers`/`body`/guards) to `undefined` when used alone — or the repo's own clean-room cast (`ctx.services as AppServices`). The docs example was corrected to the cast pattern; the ergonomic gap is API-shaped. | API-shaped (docs corrected) | `docs/services.md` example fixed; ergonomic redesign deferred |
| RF-2 | **drizzle bun-sqlite `.get()` returns a values-array, `.run()` resolves `void`.** Single-row reads/mutations need `.all()` + `RETURNING`. Nothing Lugas-specific — but the drizzle doc/example never mentions it, and the natural `SELECT … WHERE id = ?`-style code silently produces arrays. | docs | noted in `examples/realworld/README.md`; `docs/drizzle.md` candidate follow-up |
| RF-3 | **Framework-owned statuses (422, 413, 415, 400) are absent from the typed-client status union.** The union is handler-return + guard short-circuits only, so `invalid.status === 422` is a compile error even though every validation-failed response is documented wire behavior. A route declaring `body` could statically know "422 possible". | API-shaped | recorded; no change |
| RF-4 | **Declaring any `headers` schema makes the client options argument required** — `{ headers: {} }` must be passed for a call with no headers. Correct (options are the only channel) but surprising; the `{ headers: {} }` idiom appears in `examples/client` but is undocumented. | docs | noted here; getting-started candidate follow-up |
| RF-5 | **No first-class way to send undeclared headers (cookies) through the typed client.** Browser users must either declare a `cookie` header schema per route (works; adopted in the app) or leave the typed client. Deliberate strictness (`init` headers are stripped per `docs/client.md`), but the cookie-session story currently ends at "use plain fetch". | API-shaped | recorded; cookie guidance candidate for `docs/client.md` |
| RF-6 | **Scalar UI opt-in is easy to misread.** `docs/openapi.md` shows `ui: { path: "/docs" }` with the comment `// default: "/docs"` — I shipped that and got a 404 until finding "When `ui` is enabled" two sections later. `ui: true` is required. | docs | fixed in this PR |
| RF-7 | **`ws.publish` does not echo to the sender** (Bun pub/sub semantics). Presence code that expects self-echo hangs silently. | docs | noted in `examples/realworld/README.md`; websockets doc candidate |

Also verified as **working exactly as documented** (worth stating): the init
traffic gate, shutdown drain with `closeOnDispose`, access-log redaction
(no bodies/headers in the log), Problem Details shapes, multipart 413
ordering, SSE cleanup on abort, guard-before-upgrade WS rejection, and the
typed client's per-status discriminated unions for handler-declared statuses.
