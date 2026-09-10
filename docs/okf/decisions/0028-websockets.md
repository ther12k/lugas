---
type: Architecture Decision Record
title: 'ADR-0028 — WebSockets on Bun's Native Surface, Guarded Before the Upgrade'
status: accepted
tags:
- adr
- architecture
- websockets
- sse
- '0028'
generated:
  by: zcode/glm
  at: '2026-09-10T00:00:00+07:00'
---

# ADR-0028 — WebSockets on Bun's Native Surface, Guarded Before the Upgrade

## Status

Accepted by owner decision (ODR-0012, `docs/owner-decisions/m9-003-dispatch.md`, 2026-09-10), dispatching issue [#366](https://github.com/ther12k/lugas/issues/366) (M9-003). Fulfills item (b) of the post-beta.2 owner sequence recorded in ODR-0010 — the bidirectional companion to ADR-0023's SSE.

## Context

SSE (ADR-0023) covers server→client streams; conversations need both directions. Bun ships a native WebSocket surface — `Bun.serve({ websocket: handler })` with `server.upgrade(request, { data })` called from `fetch` — and the non-negotiable architecture pins Bun's native router and primitives. Lugas therefore must not wrap, proxy, or abstract `ServerWebSocket`: the native socket stays the application's object, exactly as `Native Request/Response/Headers` rule (ADR-0003 family).

The actual gap is the *decision*, not the socket. Today an application must hand-write, inside a raw `fetch`, the entire pre-upgrade decision chain Lugas already owns: authentication (from headers or cookies), params/query validation, service readiness (the ADR-0020 traffic gate), and the rejection response when the decision fails. That is precisely the compiled route pipeline (guards, schema slots, error policy, logging) — it only has never had a reason to run before an upgrade. The second gap is lifecycle: Bun's graceful `stop()` leaves open WebSockets untouched, so a server with live sockets never drains; applications need a deterministic close-with-reason semantics tied to `lugasLifecycle.shutdown()`.

Zero production dependencies carries over as a hard constraint; WebSockets are part of `Bun.serve` itself, so this is free by construction.

## Decision

1. **`websocket(config)` is a new route value kind**, declared at a path or method position like `route()`:
   `{ before?, params?, query?, headers?, message, open?, close?, drain? }`.
   `message` is required (a socket that cannot respond to input has no server-side reason to exist); `open`/`close`/`drain` are optional. Unknown keys are rejected (`LUGAS_WS_001`), mirroring `route()`/`guard()` typo discipline.
2. **The upgrade decision runs through the ordinary compiled pipeline.** Guards (`before`) execute before the upgrade; a guard short-circuit (`Response`) rejects the handshake with that exact HTTP response — 401 from an auth guard, 403 from a role check. `params`/`query`/`headers` schemas validate before the upgrade; failures are the ordinary `400`/`422` Problem Details responses. The ADR-0020 traffic gate holds upgrades during service init, and the error policy redacts handler/guard throws — all reused, not reimplemented.
3. **The native socket is passed through unwrapped.** `open`/`message`/`close`/`drain` receive Bun's `ServerWebSocket` as-is — `send`, `subscribe`/`publish`, `ping`/`pong`, `binaryType`, `readyState` are Bun's API used directly. Lugas adds nothing to the socket and takes nothing away.
4. **The assembled context rides `ws.data`** under a framework-namespaced key: services, validated params/query/headers outputs, and ordered guard enrichments — the same context shape route handlers receive, so handler types are derived from the descriptor exactly like `route()`. Each event handler is `(ws, …, context)`.
5. **Multiplexing, not fan-in:** Bun allows one `websocket` handler per server. Lugas dispatches per route through the data key; an application that passes its own `websocket` option via `serve()` while the app declares websocket routes fails at startup (`LUGAS_WS_002`) rather than silently shadowing routes.
6. **Honest rejection:** a non-upgrade request (missing `Upgrade` header) reaching a websocket route returns `426 Upgrade Required` Problem Details — never a hang, never a 500.
7. **Shutdown semantics:** `lugasLifecycle.shutdown()` closes every open Lugas-tracked socket with close code `1001` (Going Away) during the stop-accepting phase, before the drain deadline; route `close` handlers run, and the drain then observes a socket-free server. Long-lived sockets never "finish", so the graceful-drain contract for WebSockets is *close with a reason*, not wait-for-completion. `closeIdleConnections`/`stop(true)` remain Bun's surfaces, unchanged.
8. **Manifest:** websocket routes appear as ordinary route facts at their path and method; the `lugas-manifest-v1` schema is frozen and gains nothing — the transport kind is not manifest vocabulary.
9. **Packaging:** additive root exports (`websocket` value + `WebSocketConfig` type); no subpath, no dependencies; `package.json`/`bun.lock` untouched.
10. **Diagnostics:** `LUGAS_WS_001` (invalid websocket configuration), `LUGAS_WS_002` (serve-time `websocket` option conflict) — catalogued; goldens regenerated with the reason recorded.

## Consequences

- Positive: auth/validation/readiness for WebSockets become the *same* code path as routes — one vocabulary (`before`, schemas, guards), zero new auth semantics.
- Positive: the socket surface stays 100% Bun; no deprecation risk inside Lugas when Bun extends WebSockets (new `ServerWebSocket` methods are immediately usable).
- Cost/tradeoff: upgraded requests access-log as `204` (the upgrade response is discarded by Bun after the handshake) — documented; socket-level observability is the application's (or a logging guard at upgrade time).
- Cost/tradeoff: cross-origin WebSocket handshakes are not subject to browser CORS, so the first-party CORS policy cannot protect them; origin checking is an application guard (recipe in `docs/websockets.md`). This is Web platform truth, not a Lugas choice, but it must be stated.
- Compatibility effect: one additive route kind + two diagnostics; the compiled pipeline and lifecycle gain a WebSocket hook without schema or contract changes.

## Alternatives considered

- **A Lugas `WebSocket` wrapper class (typed `send<T>`, channel abstraction):** rejected — a runtime proxy over the native socket, violating the no-proxy rule and freezing Lugas against Bun's socket evolution. Recipe-level helpers can be added later as pure functions if evidence demands.
- **`upgrade()` as a distinct route-map verb (`"/ws": { UPGRADE: … }`):** rejected — upgrades are GETs on the wire; a pseudo-method would misrepresent the manifest and duplicate method-map machinery for one kind.
- **Per-route `websocket` handler objects passed to Bun:** rejected — Bun allows exactly one handler object per server; multiplexing through the data key is the only native composition, and it keeps declaration-order semantics identical to routes.
- **Optional JSON message schema (`message: { schema, handler }`):** rejected for this battery — binary/text message contracts are app-domain concerns; a JSON codec assumption belongs in a pure helper if evidence demands (revisit trigger below).
- **Drain-waits-for-sockets semantics:** rejected — wait-forever contradicts the ADR-0020 deadline invariant; close-with-1001 before the drain is deterministic and honest.

## Evidence

Implementation issue [#366](https://github.com/ther12k/lugas/issues/366) (M9-003) delivers behavior tests (guard rejection, 426, typed context across open/message/close, shutdown close-1001, multi-route multiplexing), `docs/websockets.md`, and `examples/websockets/`; evidence report `docs/reports/issues/M9-003.md`.

## Revisit trigger

If applications demonstrate repeated message-codec boilerplate, a pure `parseJsonMessage` helper (function, not wrapper) can be added with its own evidence. If Bun ships per-route WebSocket handlers or upgrade middleware, this ADR's multiplexing decision should be revisited for simplification.
