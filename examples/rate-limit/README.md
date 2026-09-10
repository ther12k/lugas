# Rate limiting example

Demonstrates the M9-008 rate-limit contract ([ADR-0034](../../docs/okf/decisions/0034-rate-limit-contract.md)):

- `POST /login` — a strict shield over the credential check: 5 requests per minute, counting all traffic, 429 with `Retry-After` and the `RateLimit-*` fields once exhausted.
- `GET /api/data` — a generous per-API-key limiter (10/minute) whose handler reads the `rateLimit` enrichment (typed `ctx.rateLimit.remaining`).
- Both routes share one application-owned store, separated by `keyPrefix`. The memory store is a single-process reference — production swaps in Redis or any `get()`/`increment()` object.

```bash
bun run examples/rate-limit/server.ts

for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "%{http_code} " -X POST localhost:3012/login; done
# 200 200 200 200 200 429   → 6th attempt is blocked

curl -i -X POST localhost:3012/login
# observe: retry-after, ratelimit-limit, ratelimit-remaining, ratelimit-reset,
# and the application/problem+json body

curl localhost:3012/api/data -H "x-api-key: demo"     # {"remaining":9,...}
curl -s -o /dev/null -w "%{http_code}" localhost:3012/api/data -H "x-api-key: other"
# 200 — per-key buckets are independent
```
