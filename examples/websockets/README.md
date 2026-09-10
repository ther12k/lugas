# WebSockets example

Demonstrates the M9-003 websocket routes ([ADR-0028](../../docs/okf/decisions/0028-websockets.md)):

- `GET /echo?token=secret` upgrades; other tokens are rejected with a plain `401` by the guard **before the handshake**.
- `open` greets, `message` echoes, `close` logs — the context (`ctx.user`) is guard enrichment, typed from the descriptor.
- Ctrl-C shuts down via `shutdown: { signals: true }`; connected clients observe close `1001 "server shutting down"`.

```bash
bun run examples/websockets/server.ts
# in another shell:
bun -e 'const ws = new WebSocket("ws://localhost:3008/echo?token=secret"); ws.onmessage = (e) => console.log(e.data); ws.onopen = () => ws.send("hello");'
```
