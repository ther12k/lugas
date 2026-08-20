# M0 Raw Bun Benchmark Fixtures

Fixtures use Bun native `Bun.serve({ routes })`, port 0 by default or `PORT`/`BENCH_PORT`, `/__ready` readiness, one JSON environment line, READY log, and SIGTERM/SIGINT graceful stop.

| Fixture | Endpoint | Isolates |
|---|---|---|
| static | `/` | static Response route |
| sync-json | `/json` | synchronous JSON handler |
| async | `/async` | async microtask handler |
| params | `/items/:id` | parameter extraction |
| validation-placeholder | `/validate` | cheap inline validation-shaped path |
| large-routes | `/route/0`…`/route/999` | deterministic 1,000-route startup |

Readiness: `bun run scripts/bench/readiness.ts <url-or-port> [--timeout-ms N]`. Exit 0 ready, 1 timeout, 2 usage. No benchmark results or performance claims belong to M0-007; M5 measures them with frozen methodology.
