/**
 * M0-008 — Smoke test for the Elysia 2 comparison fixture.
 *
 * Boots the app in-process and drives every endpoint through Elysia's
 * `.handle()` (no sockets) so the fixture is executable evidence. One
 * lifecycle test binds a real ephemeral socket to prove the readiness
 * contract and graceful `stop()` used by the M5 harness. SIGTERM handling
 * lives in server.ts and is exercised by the commands recorded in
 * docs/reports/issues/M0-008.md.
 */
import { describe, expect, test } from "bun:test";
import { createBenchApp, FIXTURE_API_TOKEN } from "./app";

const app = createBenchApp();

const BASE = "http://fixture.local";

function request(path: string, init?: RequestInit): Request {
  return new Request(`${BASE}${path}`, init);
}

function postJson(path: string, body: unknown): Request {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("baseline scenarios", () => {
  test("GET /__ready returns 200 ready", async () => {
    const res = await app.handle(request("/__ready"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ready");
  });

  test("GET /static returns the static payload", async () => {
    const res = await app.handle(request("/static"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  test("GET /json-sync returns the sync JSON payload", async () => {
    const res = await app.handle(request("/json-sync"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ hello: "world" });
  });

  test("GET /json-async returns the same payload from an async handler", async () => {
    const res = await app.handle(request("/json-async"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ hello: "world" });
  });

  test("GET /items/:id echoes the path parameter as a string", async () => {
    const res = await app.handle(request("/items/42"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "42" });
  });
});

describe("validation scenarios", () => {
  test("POST /echo echoes a valid body", async () => {
    const res = await app.handle(postJson("/echo", { name: "a", count: 2 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "a", count: 2 });
  });

  test("POST /echo accepts a body without the optional count", async () => {
    const res = await app.handle(postJson("/echo", { name: "a" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "a" });
  });

  test("POST /echo rejects a schema-invalid body with a 422 problem", async () => {
    const res = await app.handle(postJson("/echo", { name: 5 }));
    expect(res.status).toBe(422);
    const problem = (await res.json()) as { type: string; status: number; on: string };
    expect(problem.type).toBe("validation");
    expect(problem.status).toBe(422);
    expect(problem.on).toBe("body");
  });

  test("POST /echo rejects malformed JSON with a 400 problem", async () => {
    const res = await app.handle(
      request("/echo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
    const problem = (await res.json()) as { type: string; status: number };
    expect(problem.type).toBe("parse");
    expect(problem.status).toBe(400);
  });

  test("GET /search coerces a numeric query parameter", async () => {
    const res = await app.handle(request("/search?q=hi&limit=10"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { q: string; limit: number };
    expect(body).toEqual({ q: "hi", limit: 10 });
    expect(typeof body.limit).toBe("number");
  });

  test("GET /search omits an absent optional parameter", async () => {
    const res = await app.handle(request("/search?q=hi"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ q: "hi" });
  });

  test("GET /search rejects a non-numeric limit with a 422 problem", async () => {
    const res = await app.handle(request("/search?q=hi&limit=abc"));
    expect(res.status).toBe(422);
    const problem = (await res.json()) as { type: string; status: number; on: string };
    expect(problem.type).toBe("validation");
    expect(problem.status).toBe(422);
    expect(problem.on).toBe("query");
  });

  test("GET /search rejects a missing required parameter", async () => {
    const res = await app.handle(request("/search"));
    expect(res.status).toBe(422);
  });
});

describe("guard scenarios", () => {
  const authed = {
    "x-api-key": FIXTURE_API_TOKEN,
    "x-request-id": "r-1",
  };

  test("GET /guarded returns the derived request id", async () => {
    const res = await app.handle(request("/guarded", { headers: authed }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ requestId: "r-1" });
  });

  test("GET /guarded defaults the request id when the header is absent", async () => {
    const res = await app.handle(
      request("/guarded", { headers: { "x-api-key": FIXTURE_API_TOKEN } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ requestId: "unset" });
  });

  test("GET /guarded rejects a missing API key with 401", async () => {
    const res = await app.handle(request("/guarded"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  test("GET /guarded rejects a wrong API key with 401", async () => {
    const res = await app.handle(
      request("/guarded", { headers: { "x-api-key": "wrong" } }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  test("GET /combined stacks validation, guard, and derived context", async () => {
    const res = await app.handle(request("/combined?n=5", { headers: authed }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { n: number; requestId: string };
    expect(body).toEqual({ n: 5, requestId: "r-1" });
    expect(typeof body.n).toBe("number");
  });

  test("GET /combined is guarded before validation runs", async () => {
    const res = await app.handle(request("/combined?n=5"));
    expect(res.status).toBe(401);
  });
});

describe("default error behavior", () => {
  test("unknown routes return a 404 problem-details response", async () => {
    const res = await app.handle(request("/nope"));
    expect(res.status).toBe(404);
    const problem = (await res.json()) as { type: string; title: string; status: number };
    expect(problem.type).toBe("not-found");
    expect(problem.status).toBe(404);
  });
});

describe("server lifecycle", () => {
  test("listen(0) binds an ephemeral port, serves /__ready, and stop() closes it", async () => {
    const lifecycleApp = createBenchApp();
    lifecycleApp.listen(0);

    const port = lifecycleApp.server?.port;
    expect(typeof port).toBe("number");
    expect(port as number).toBeGreaterThan(0);

    const res = await fetch(`http://localhost:${port}/__ready`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ready");

    await lifecycleApp.stop();

    let refused = false;
    try {
      await fetch(`http://localhost:${port}/__ready`, {
        signal: AbortSignal.timeout(500),
      });
    } catch {
      refused = true;
    }
    expect(refused).toBe(true);
  });
});
