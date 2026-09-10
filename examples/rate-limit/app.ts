import { defineApp, json, rateLimit, route } from "../../src/index";
import { createMemoryRateLimitStore } from "../../src/core/rate-limit";

// Application-owned storage. The memory store is a reference for
// single-process development (ADR-0034); production swaps in Redis,
// Postgres, or any object implementing get()/increment().
const store = createMemoryRateLimitStore();

export const app = defineApp({
  routes: {
    // Strict limiter shielding the credential check: counts ALL traffic,
    // authenticated or not, because it is declared first.
    "/login": {
      POST: route({
        before: [rateLimit({ limit: 5, windowMs: 60_000, store, keyPrefix: "login:" })],
        handler: () => json(200, { message: "credential check would run here" }),
      }),
    },
    // Generous API limiter with per-key buckets and visible quota.
    "/api/data": {
      GET: route({
        before: [
          rateLimit({
            limit: 10,
            windowMs: 60_000,
            store,
            keyPrefix: "api:",
            key: (ctx) => ctx.request.headers.get("x-api-key") ?? "anon",
          }),
        ],
        handler: (ctx) => json(200, { data: [1, 2, 3], remaining: ctx.rateLimit.remaining }),
      }),
    },
  },
});

export default app;
