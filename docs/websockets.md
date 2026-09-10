---
type: Guide
title: WebSockets
status: current
tags:
- guide
- websockets
- guards
---

# WebSockets

Lugas wires WebSockets into the route map on **Bun's native WebSocket surface** — the socket your handlers receive is Bun's `ServerWebSocket`, unwrapped and un-proxied (`send`, `subscribe`/`publish`, `ping`, `binaryType` are Bun's API used directly). What Lugas adds is the *decision*: the same validation, guards, and service-readiness gate that ordinary routes get, applied **before the handshake** — plus deterministic shutdown for open sockets. See [ADR-0028](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0028-websockets.md).

## Declaring a websocket route

```ts
import { defineApp, guard, websocket } from "lugas";

const auth = guard({
  name: "auth",
  handler: ({ request }) => {
    const token = new URL(request.url).searchParams.get("token");
    return token === "secret" ? { user: "usr_1" } : new Response(null, { status: 401 });
  },
});

export default defineApp({
  routes: {
    "/ws": {
      GET: websocket({
        before: [auth],                                  // runs BEFORE the upgrade
        message: (ws, message, ctx) => ws.send(`echo to ${ctx.user}: ${message}`),
        open: (ws, ctx) => ws.send(`welcome ${ctx.user}`),
        close: (ws, code, reason, ctx) => { /* cleanup per socket */ },
        drain: (ws, ctx) => { /* backpressure lifted; resume sending */ },
      }),
    },
  },
});
```

The handler signature is `(ws, …, context)`:

| Handler | Receives | Notes |
|---|---|---|
| `message` | `(ws, message, ctx)` | **Required.** `message` is `string \| Uint8Array` (binary form follows the socket's `binaryType`). |
| `open` | `(ws, ctx)` | Handshake completed; safe to `send`. |
| `close` | `(ws, code, reason, ctx)` | Either side closed — or Lugas closed the socket during shutdown with code `1001`. |
| `drain` | `(ws, ctx)` | Backpressure lifted; check `ws.bufferedAmount` before resuming bulk sends. |

The `ctx` in every handler is the **same context type route handlers get** — services, validated `params`/`query`/`headers`, and guard enrichments, all derived from the descriptor at compile time. There is no `ctx.body` (the handshake carries no framework-parsed body).

## Guards decide the upgrade

`before` guards run before the handshake. A guard returning a `Response` rejects the upgrade with that exact response — authentication and authorization are ordinary guards, identical to [routes](./routing.md):

```ts
GET: websocket({
  before: [authGuard, roomMemberGuard],   // 401 → handshake rejected as 401; 403 as 403
  message,
})
```

Schema slots validate before the upgrade too — a bad query string gets the ordinary `422` Problem Details, never a half-open socket:

```ts
GET: websocket({
  query: z.object({ room: z.string().min(2) }),
  message,
})
```

Requests that reach the upgrade decision without WebSocket handshake headers return **`426 Upgrade Required`** — honest HTTP for an honest mistake (a browser navigating to `ws://…`'s http twin, say), never a hang.

## What Lugas does not do

- **No wrapper class.** The socket is Bun's `ServerWebSocket`. Sub-protocol negotiation, `binaryType`, backpressure (`bufferedAmount`, `drain`), and pub/sub channels (`ws.subscribe`/`ws.publish`/`ws.publishText`) are native API — used directly.
- **No message codec.** Messages are `string | Uint8Array`; JSON parsing is `JSON.parse` in your handler (see the revisit trigger in ADR-0028 before expecting a helper).
- **No CORS on handshakes.** The WebSocket handshake is not subject to browser CORS, so the first-party [CORS](./cors.md) policy cannot protect it. **Check the `Origin` header in a guard** for browser-facing sockets:

  ```ts
  const sameOrigin = guard({
    name: "same-origin",
    handler: ({ request }) => {
      const origin = request.headers.get("origin");
      if (origin !== undefined && origin !== null && new URL(origin).host !== new URL(request.url).host) {
        return new Response(null, { status: 403 });
      }
      return {};
    },
  });
  ```

## Shutdown semantics

Long-lived sockets never "finish", so the graceful-drain contract for WebSockets is **close with a reason**, not wait-forever. When `server.lugasLifecycle.shutdown()` runs, every open Lugas-tracked socket is closed with code `1001` (Going Away, reason `"server shutting down"`) before the drain deadline starts; your `close` handlers run, and clients see the close frame:

```ts
const server = app.serve({ port: 3000, shutdown: { signals: true } });
// on shutdown, every client observes: close 1001 "server shutting down"
```

New upgrades are refused once shutdown begins (the server stops accepting), and the rest of the lifecycle — drain deadline, reverse-order disposal, distinct outcomes — behaves exactly as documented in [services](./services.md).

## Manifest and CLI

Websocket routes appear in the manifest and `bunx lugas routes` output as ordinary routes at their path and method, with their guard names and declared validation slots — the transport kind is not manifest vocabulary:

```bash
bunx lugas routes ./app.ts
# GET /ws   guards: auth   validates: query
```

## Diagnostics

| Code | Thrown by | Meaning |
|---|---|---|
| `LUGAS_WS_001` | `websocket()` | Invalid configuration (missing `message`, unknown keys, malformed guards) |
| `LUGAS_WS_002` | `serve()` | A custom `websocket` option conflicts with declared websocket routes |

## Where next

- [Guards](./guards.md) — the enrichment that flows into your socket handlers.
- [SSE](./sse.md) — the one-directional companion for server-push streams.
- [Services](./services.md) — the shutdown lifecycle closing your sockets.
