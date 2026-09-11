/**
 * Realworld reference app integration tests (dogfood, 0.1.0 stabilization).
 *
 * Exercises every composed capability through the public API against a live
 * server: auth cookies, guards, CRUD + validation, multipart upload limits,
 * OpenAPI/Scalar, SSE notifications, WebSocket presence, health endpoints,
 * and graceful shutdown with closeOnDispose.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { app } from "../../examples/realworld/app";

const server = app.serve({ port: 0, development: false, shutdown: { drainDeadlineMs: 1_500 } });
const base = server.url.origin;

let cookie = "";

async function login(name: string): Promise<void> {
  const res = await fetch(new URL("/auth/login", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  expect(res.status).toBe(200);
  const setCookie = res.headers.get("set-cookie");
  expect(setCookie).toContain("session=");
  expect(setCookie).toContain("HttpOnly");
  cookie = setCookie!.split(";")[0]!;
}

afterAll(async () => {
  await server.lugasLifecycle.shutdown();
});

describe("health", () => {
  test("GET /health and /ready answer after init", async () => {
    const health = await fetch(new URL("/health", base));
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    const ready = await fetch(new URL("/ready", base));
    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual({ status: "ready" });
  });
});

describe("auth (cookies + guards)", () => {
  test("GET /me without a session is 401", async () => {
    const res = await fetch(new URL("/me", base));
    expect(res.status).toBe(401);
  });

  test("login sets an HttpOnly session cookie", async () => {
    await login("ada");
    const res = await fetch(new URL("/me", base), { headers: { cookie } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { name: string } };
    expect(body.user.name).toBe("ada");
  });

  test("logout revokes the session", async () => {
    const res = await fetch(new URL("/auth/logout", base), {
      method: "POST",
      headers: { cookie },
    });
    expect(res.status).toBe(200);
    const revoked = await fetch(new URL("/me", base), { headers: { cookie } });
    expect(revoked.status).toBe(401);
    await login("ada"); // re-establish for later suites
  });
});

describe("users CRUD + validation", () => {
  test("query coercion paginates", async () => {
    const res = await fetch(new URL("/users?page=1&limit=5", base));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: unknown[]; page: number };
    expect(body.page).toBe(1);
    expect(Array.isArray(body.users)).toBe(true);
  });

  test("invalid body is 422 VALIDATION_FAILED", async () => {
    const res = await fetch(new URL("/users", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "x", email: "not-an-email" }),
    });
    expect(res.status).toBe(422);
    const problem = (await res.json()) as { code: string; source: string };
    expect(problem.code).toBe("VALIDATION_FAILED");
    expect(problem.source).toBe("body");
  });

  test("create/read/update/delete round-trip with guard on writes", async () => {
    const create = await fetch(new URL("/users", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "grace", email: `grace-${Date.now()}@x.io` }),
    });
    expect(create.status).toBe(201);
    const created = (await create.json()) as { id: number; name: string };
    expect(created.id).toBeGreaterThan(0);

    const read = await fetch(new URL(`/users/${created.id}`, base));
    expect(read.status).toBe(200);

    const unguarded = await fetch(new URL(`/users/${created.id}`, base), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "renamed" }),
    });
    expect(unguarded.status).toBe(401);

    const patch = await fetch(new URL(`/users/${created.id}`, base), {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ name: "renamed" }),
    });
    expect(patch.status).toBe(200);

    const remove = await fetch(new URL(`/users/${created.id}`, base), {
      method: "DELETE",
      headers: { cookie },
    });
    expect(remove.status).toBe(200);

    const gone = await fetch(new URL(`/users/${created.id}`, base));
    expect(gone.status).toBe(404);
  });

  test("duplicate email is 409 problem details", async () => {
    const res = await fetch(new URL("/users", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "second-ada", email: "ada@example.com" }),
    });
    expect(res.status).toBe(409);
    const problem = (await res.json()) as { title: string };
    expect(problem.title).toContain("registered");
  });
});

describe("multipart avatar", () => {
  test("upload returns file facts; oversize file is 413", async () => {
    const form = new FormData();
    form.append("avatar", new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" }));
    const ok = await fetch(new URL("/users/1/avatar", base), {
      method: "POST",
      headers: { cookie },
      body: form,
    });
    expect(ok.status).toBe(201);
    const body = (await ok.json()) as { avatar: { name: string; size: number } };
    expect(body.avatar.name).toBe("a.png");
    expect(body.avatar.size).toBe(3);

    const big = new FormData();
    big.append(
      "avatar",
      new File([new Uint8Array(2 * 1024 * 1024)], "big.png", { type: "image/png" }),
    );
    const refused = await fetch(new URL("/users/1/avatar", base), {
      method: "POST",
      headers: { cookie },
      body: big,
    });
    expect(refused.status).toBe(413);
    const problem = (await refused.json()) as { code: string };
    expect(problem.code).toBe("FORM_LIMIT_EXCEEDED");
  });
});

describe("OpenAPI + Scalar", () => {
  test("document lists every route; UI shell serves", async () => {
    const doc = await fetch(new URL("/openapi.json", base));
    expect(doc.status).toBe(200);
    const document = (await doc.json()) as { paths: Record<string, unknown> };
    for (const path of [
      "/auth/login",
      "/auth/logout",
      "/me",
      "/users",
      "/users/{id}",
      "/users/{id}/avatar",
      "/events",
      "/ws",
    ]) {
      expect(document.paths[path]).toBeDefined();
    }
    const ui = await fetch(new URL("/docs", base));
    expect(ui.status).toBe(200);
  });
});

describe("SSE notifications", () => {
  test("stream yields connected + user.created from a live POST", async () => {
    const controller = new AbortController();
    const res = await fetch(new URL("/events", base), {
      headers: { cookie, accept: "text/event-stream" },
      signal: controller.signal,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toStartWith("text/event-stream");

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    // Fire a create while the stream is open — user.created is emitted live.
    void fetch(new URL("/users", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "streamed", email: `sse-${Date.now()}@x.io` }),
    });
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline && !text.includes("user.created")) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    controller.abort();

    expect(text).toContain("event: connected");
    expect(text).toContain("retry: 3000");
    expect(text).toContain("event: user.created");
  });
});

describe("WebSocket presence", () => {
  test("unauthenticated upgrade is rejected", async () => {
    const ws = new WebSocket(`ws://${server.url.host}/ws`);
    const closed = new Promise<number>((resolve) => {
      ws.onerror = () => {};
      ws.onclose = (e) => resolve(e.code);
    });
    expect(await closed).toBeTruthy(); // rejected before any frame (1002 on Bun 1.4)
  });

  test("query-token sessions see join/message/leave", async () => {
    await login("ada");
    const token = cookie.split("=")[1];
    const ada = new WebSocket(`ws://${server.url.host}/ws?session=${token}`);
    const adaSees: string[] = [];
    ada.onmessage = (e) => adaSees.push(String(e.data));
    await new Promise((r) => (ada.onopen = r));

    const grace = new WebSocket(`ws://${server.url.host}/ws?session=${token}`);
    const graceSees: string[] = [];
    grace.onmessage = (e) => graceSees.push(String(e.data));
    await new Promise((r) => (grace.onopen = r));

    await Bun.sleep(100);
    ada.send("hello presence");
    await Bun.sleep(100);
    grace.close();
    await Bun.sleep(200);

    expect(adaSees.some((m) => m.includes("join"))).toBe(true);
    expect(adaSees.some((m) => m.includes("leave"))).toBe(true);
    expect(graceSees.some((m) => m.includes("hello presence"))).toBe(true);
    ada.close();
    await Bun.sleep(150); // let client-initiated closes settle before drain
  });
});
