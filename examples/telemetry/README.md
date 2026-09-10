# Telemetry example

Demonstrates M9-006 ([ADR-0032](../../docs/okf/decisions/0032-telemetry-hooks.md)):

- `onRequestStart` / `onRequestEnd` receive scalar-only events (`method`, `path`, `route`, `requestId`, `status`, `durationMs`, `errorClass`).
- One identity: with `logging.requestIds`, the id in the events matches `x-request-id` and the access log.
- `errorClass` classifies 500s as `handler`, 401/403 as `guard`, framework validation as `framework`.

```bash
bun run examples/telemetry/server.ts
curl -i localhost:3011/ping    # observe [start]/[end] on the console + x-request-id
curl localhost:3011/crash      # observe errorClass=handler on a redacted 500
```
