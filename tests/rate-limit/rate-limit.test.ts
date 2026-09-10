/**
 * Rate-limit contract behavior tests (M9-008, ADR-0034).
 *
 * The framework owns the semantics — fixed-window accounting, the 429 shape
 * (Retry-After, RateLimit-* fields, RFC 9457 body), key extraction, typed
 * enrichment — while storage stays application-owned. A hand-rolled fake
 * store with an injectable clock proves the absence of hidden coupling to
 * the reference store; a real server proves the wire behavior end-to-end.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, guard, json, rateLimit, route } from "../../src/index";
import { createMemoryRateLimitStore, type RateLimitSnapshot, type RateLimitStore } from "../../src/core/rate-limit";
import { createTestServer } from "../../src/testing";

/** Hand-rolled structural fake: fixed-window counting over an injectable clock. */
function createFakeStore(clock: { now: number }): RateLimitStore & { calls: string[] } {
  const buckets = new Map<string, RateLimitSnapshot>();
  return {
    calls: [],
    async get(key) {
      this.calls.push(`get:${key}`);
      return buckets.get(key);
    },
    async increment(key, windowMs) {
      this.calls.push(`increment:${key}:${windowMs}`);
      const current = buckets.get(key);
      if (current === undefined || current.resetAt <= clock.now) {
        const fresh = { count: 1, resetAt: clock.now + windowMs };
        buckets.set(key, fresh);
        return fresh;
      }
      const advanced = { count: current.count + 1, resetAt: current.resetAt };
      buckets.set(key, advanced);
      return advanced;
    },
  };
}

describe("rateLimit() config validation", () => {
  test("LUGAS_RATE_LIMIT_001 on each invalid shape", () => {
    const store = createMemoryRateLimitStore();
    const cases: unknown[] = [
      42,
      { limit: 5, windowMs: 1000, store, extra: true },
      { limit: 1.5, windowMs: 1000, store },
      { limit: 0, windowMs: 1000, store },
      { limit: 5, windowMs: -1, store },
      { limit: 5, windowMs: 1000 },
      { limit: 5, windowMs: 1000, store: { get: async () => undefined } },
      { limit: 5, windowMs: 1000, store, key: "api-key" },
      { limit: 5, windowMs: 1000, store, keyPrefix: 7 },
      { limit: 5, windowMs: 1000, store, message: { nope: true } },
    ];
    for (const config of cases) {
      try {
        // @ts-expect-error — deliberately invalid runtime shapes
        rateLimit(config);
        throw new Error("expected rateLimit() to throw");
      } catch (err) {
        expect((err as { code?: string }).code).toBe("LUGAS_RATE_LIMIT_001");
      }
    }
  });

  test("valid minimal config does not throw", () => {
    expect(() => rateLimit({ limit: 5, windowMs: 60_000, store: createMemoryRateLimitStore() })).not.toThrow();
  });
});

describe("fixed-window semantics over a real server", () => {
  function buildApp(store: RateLimitStore, limit = 3) {
    return defineApp({
      routes: {
        "/api": {
          GET: route({
            before: [rateLimit({ limit, windowMs: 60_000, store, keyPrefix: "api:" })],
            handler: (ctx) => json(200, { remaining: ctx.rateLimit.remaining, resetAt: ctx.rateLimit.resetAt, limit: ctx.rateLimit.limit }),
          }),
        },
      },
    });
  }

  test("under limit passes with decrementing enrichment; limit+1 short-circuits 429", async () => {
    const server = createTestServer(buildApp(createMemoryRateLimitStore(), 3));
    try {
      const first = await server.fetch("/api");
      expect(first.status).toBe(200);
      const body = (await first.json()) as { remaining: number; limit: number; resetAt: number };
      expect(body).toEqual({ remaining: 2, limit: 3, resetAt: expect.any(Number) });

      expect((await server.fetch("/api")).status).toBe(200);
      const third = await server.fetch("/api");
      expect(third.status).toBe(200);
      expect(((await third.json()) as { remaining: number }).remaining).toBe(0);

      const fourth = await server.fetch("/api");
      expect(fourth.status).toBe(429);
      expect(fourth.headers.get("ratelimit-limit")).toBe("3");
      expect(fourth.headers.get("ratelimit-remaining")).toBe("0");
      expect(Number.isFinite(Number(fourth.headers.get("ratelimit-reset")))).toBe(true);
      expect(Number.isFinite(Number(fourth.headers.get("retry-after")))).toBe(true);
      expect(fourth.headers.get("content-type")).toBe("application/problem+json");
      const problem = (await fourth.json()) as { type: string; title: string; status: number; detail: string };
      expect(problem.type).toBe("https://lugasjs.dev/problems/rate-limited");
      expect(problem.title).toBe("Too Many Requests");
      expect(problem.status).toBe(429);
    } finally {
      await server.stop();
    }
  });

  test("window expiry admits again (fake clock, no real sleeping)", async () => {
    const clock = { now: Date.now() };
    const store = createFakeStore(clock);
    const server = createTestServer(buildApp(store, 1));
    try {
      expect((await server.fetch("/api")).status).toBe(200);
      expect((await server.fetch("/api")).status).toBe(429);

      clock.now += 60_001; // roll past the window
      const after = await server.fetch("/api");
      expect(after.status).toBe(200);
      expect(((await after.json()) as { remaining: number }).remaining).toBe(0);
    } finally {
      await server.stop();
    }
  });

  test("Retry-After derives from the store's resetAt (real-epoch contract)", async () => {
    // resetAt is epoch milliseconds, so Retry-After math uses real time; the
    // fake-clock test above already proved the guard never touches timers
    // for admission decisions — the store owns expiry.
    const server = createTestServer(buildApp(createMemoryRateLimitStore(), 1));
    try {
      expect((await server.fetch("/api")).status).toBe(200);
      const blocked = await server.fetch("/api");
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("retry-after")).toBe("60");
      expect(blocked.headers.get("ratelimit-reset")).toBe("60");
    } finally {
      await server.stop();
    }
  });

  test("custom key: per-API-key buckets stay independent", async () => {
    const store = createMemoryRateLimitStore();
    const server = createTestServer(
      defineApp({
        routes: {
          "/keyed": {
            GET: route({
              before: [rateLimit({ limit: 1, windowMs: 60_000, store, key: (ctx) => ctx.request.headers.get("x-api-key") ?? "anon" })],
              handler: () => json(200, {}),
            }),
          },
        },
      }),
    );
    try {
      const hA = { headers: { "x-api-key": "A" } };
      const hB = { headers: { "x-api-key": "B" } };
      expect((await server.fetch("/keyed", hA)).status).toBe(200);
      expect((await server.fetch("/keyed", hA)).status).toBe(429);
      expect((await server.fetch("/keyed", hB)).status).toBe(200);
    } finally {
      await server.stop();
    }
  });

  test("keyPrefix namespaces two guards sharing one store", async () => {
    const store = createMemoryRateLimitStore();
    const server = createTestServer(
      defineApp({
        routes: {
          "/a": {
            GET: route({
              before: [rateLimit({ limit: 1, windowMs: 60_000, store, keyPrefix: "app-a:" })],
              handler: () => json(200, {}),
            }),
          },
          "/b": {
            GET: route({
              before: [rateLimit({ limit: 1, windowMs: 60_000, store, keyPrefix: "app-b:" })],
              handler: () => json(200, {}),
            }),
          },
        },
      }),
    );
    try {
      expect((await server.fetch("/a")).status).toBe(200);
      expect((await server.fetch("/a")).status).toBe(429);
      // app-b's bucket is untouched by app-a's exhaustion
      expect((await server.fetch("/b")).status).toBe(200);
    } finally {
      await server.stop();
    }
  });

  test("default key: whole-request bucket without key or prefix", async () => {
    const store = createMemoryRateLimitStore();
    const server = createTestServer(
      defineApp({
        routes: {
          "/global": {
            GET: route({
              before: [rateLimit({ limit: 1, windowMs: 60_000, store })],
              handler: () => json(200, {}),
            }),
          },
        },
      }),
    );
    try {
      expect((await server.fetch("/global")).status).toBe(200);
      expect((await server.fetch("/global")).status).toBe(429);
    } finally {
      await server.stop();
    }
  });
});

describe("guard composition and ordering", () => {
  test("declared after auth: only authenticated hits count", async () => {
    const store = createMemoryRateLimitStore();
    const authenticate = guard({
      name: "authenticate",
      handler: ({ request }) => {
        if (request.headers.get("authorization") !== "Bearer ok") return json(401, { error: "unauthorized" });
        return { user: "u1" };
      },
    });
    const server = createTestServer(
      defineApp({
        routes: {
          "/protected": {
            GET: route({
              before: [authenticate, rateLimit({ limit: 1, windowMs: 60_000, store })],
              handler: () => json(200, {}),
            }),
          },
        },
      }),
    );
    try {
      // Unauthenticated short-circuits in the auth guard BEFORE counting.
      expect((await server.fetch("/protected", { headers: { authorization: "Bearer no" } })).status).toBe(401);
      expect((await server.fetch("/protected", { headers: { authorization: "Bearer no" } })).status).toBe(401);
      // Exactly one authenticated hit fits under the limit.
      const authed = { headers: { authorization: "Bearer ok" } };
      expect((await server.fetch("/protected", authed)).status).toBe(200);
      expect((await server.fetch("/protected", authed)).status).toBe(429);
    } finally {
      await server.stop();
    }
  });

  test("memory store increments visibly through the structural get()", async () => {
    const store = createMemoryRateLimitStore();
    expect(await store.get("k")).toBeUndefined();
    expect((await store.increment("k", 1000)).count).toBe(1);
    expect((await store.increment("k", 1000)).count).toBe(2);
    expect(await store.get("k")).toEqual({ count: 2, resetAt: expect.any(Number) });
  });
});

describe("429 body override", () => {
  test("message replaces the problem body (text/plain)", async () => {
    const store = createMemoryRateLimitStore();
    const server = createTestServer(
      defineApp({
        routes: {
          "/x": {
            GET: route({
              before: [rateLimit({ limit: 1, windowMs: 60_000, store, message: "slow down" })],
              handler: () => json(200, {}),
            }),
          },
        },
      }),
    );
    try {
      expect((await server.fetch("/x")).status).toBe(200);
      const blocked = await server.fetch("/x");
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("content-type")).toBe("text/plain; charset=utf-8");
      expect(await blocked.text()).toBe("slow down");
      // Retry information survives the body override.
      expect(blocked.headers.get("retry-after")).not.toBeNull();
      expect(blocked.headers.get("ratelimit-limit")).toBe("1");
    } finally {
      await server.stop();
    }
  });
});
