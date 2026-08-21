import { describe, expect, test } from "bun:test";
import { defineApp } from "../../../src/core/app";
import { route } from "../../../src/core/route";
import { defineModule } from "../../../src/core/module";
import { json, text, empty, problem, redirect } from "../../../src/core/response";

const get = (body: string) => route({ handler: () => new Response(body) });

describe("M1 kernel conformance", () => {
  test("response helpers preserve native status/media/body", async () => {
    expect(json(201, { ok: true }).status).toBe(201);
    expect(text(200, "x").headers.get("content-type")).toContain("text/plain");
    expect(empty(204).status).toBe(204);
    expect(problem(400, { title: "bad" }).headers.get("content-type")).toContain("problem+json");
    expect(redirect("/login").status).toBe(302);
  });

  test("modules compose with root routes and native values", async () => {
    const users = defineModule({ name: "users", routes: { "/users": { GET: get("users") } } });
    const app = defineApp({ routes: { "/health": new Response("ok") }, modules: [users] });
    const server = app.serve({ port: 0 });
    expect(await (await fetch(`${server.url}health`)).text()).toBe("ok");
    expect(await (await fetch(`${server.url}users`)).text()).toBe("users");
    server.stop(true);
  });

  test("repeated lifecycle start/stop leaves no failed server", async () => {
    for (let i = 0; i < 5; i++) {
      const app = defineApp({ routes: { "/x": new Response("x") } });
      const server = app.serve({ port: 0 });
      expect((await fetch(`${server.url}x`)).status).toBe(200);
      server.stop(true);
    }
  });

  test("concurrent plain routes all complete", async () => {
    const app = defineApp({ routes: { "/a": new Response("a"), "/b": new Response("b") } });
    const server = app.serve({ port: 0 });
    const responses = await Promise.all(Array.from({ length: 20 }, (_, i) => fetch(`${server.url}${i % 2 ? "a" : "b"}`)));
    expect(responses.every((r) => r.status === 200)).toBe(true);
    server.stop(true);
  });

  test("duplicate routes fail closed", () => {
    const a = defineModule({ name: "a", routes: { "/x": { GET: get("a") } } });
    const b = defineModule({ name: "b", routes: { "/x": { GET: get("b") } } });
    expect(() => defineApp({ modules: [a, b] as never })).toThrow(/duplicate route/);
  });
});
