# Production hardening example

Demonstrates M9-004 ([ADR-0029](../../docs/okf/decisions/0029-production-hardening.md)):

- `secureHeaders: true` — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` on every pipeline response (fill-if-absent).
- `health: true` — `GET /health` answers 200 immediately (even while the service `init` is running); `GET /ready` answers 503 until init settles, then 200.

```bash
bun run examples/production/server.ts
curl -si localhost:3009/api/ping | grep -iE "x-content|x-frame|referrer"   # policy headers
curl localhost:3009/health    # 200 {"status":"ok"}
curl localhost:3009/ready     # 200 {"status":"ready"} once init settled
curl -si localhost:3009/nope | grep -i x-content                             # fallback covered too
```
