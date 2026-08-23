/**
 * Per-path method-map merge and collision semantics (M4R1-002, issue #196).
 *
 * Probes through the public API against a live server:
 * - different methods on one path merge across owners, order-independently
 * - identical method+path re-declarations fail closed naming both owners
 * - any-method vs explicit-method overlap fails closed (pinned Bun oracle
 *   resolves such overlap by insertion order; Lugas refuses instead)
 * - manifest record count matches the final merged graph
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";

const get = (label: string) => route({ handler: () => new Response(label) });
const post = (label: string) => route({ handler: () => new Response(label) });

function owners(order: "ab" | "ba") {
  const a = defineModule({ name: "a", routes: { "/x": { GET: get("A-get") } } });
  const b = defineModule({ name: "b", routes: { "/x": { POST: post("B-post"), DELETE: post("B-delete") } } });
  return { modules: order === "ab" ? [a, b] : [b, a] };
}

async function surface(server: Bun.Server<unknown>, method: string, path: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${server.url}${path.replace(/^\//, "")}`, { method });
  return { status: res.status, body: await res.text() };
}

describe("Method-map merge semantics (M4R1-002)", () => {
  test("module A GET /x + module B POST+DELETE /x all reachable", async () => {
    const app = defineApp(owners("ab"));
    expect(app.manifest.routes.length).toBe(3);
    const server = app.serve({ port: 0, development: false });
    try {
      expect(await surface(server, "GET", "/x")).toEqual({ status: 200, body: "A-get" });
      expect(await surface(server, "POST", "/x")).toEqual({ status: 200, body: "B-post" });
      expect(await surface(server, "DELETE", "/x")).toEqual({ status: 200, body: "B-delete" });
      expect((await surface(server, "PUT", "/x")).status).toBe(404);
    } finally {
      server.stop(true);
    }
  });

  test("merge is order-independent", async () => {
    for (const order of ["ab", "ba"] as const) {
      const app = defineApp(owners(order));
      const server = app.serve({ port: 0, development: false });
      try {
        expect(await surface(server, "GET", "/x")).toEqual({ status: 200, body: "A-get" });
        expect(await surface(server, "POST", "/x")).toEqual({ status: 200, body: "B-post" });
        expect(await surface(server, "DELETE", "/x")).toEqual({ status: 200, body: "B-delete" });
      } finally {
        server.stop(true);
      }
    }
  });

  test("root and module methods on one path merge", async () => {
    const users = defineModule({ name: "users", routes: { "/x": { POST: post("m-post") } } });
    const app = defineApp({ routes: { "/x": { GET: get("root-get") } }, modules: [users] });
    const server = app.serve({ port: 0, development: false });
    try {
      expect(await surface(server, "GET", "/x")).toEqual({ status: 200, body: "root-get" });
      expect(await surface(server, "POST", "/x")).toEqual({ status: 200, body: "m-post" });
    } finally {
      server.stop(true);
    }
  });

  test("identical method+path across modules still fails closed naming both owners", () => {
    const a = defineModule({ name: "a", routes: { "/dup": { GET: get("a") } } });
    const b = defineModule({ name: "b", routes: { "/dup": { GET: get("b") } } });
    try {
      defineApp({ modules: [a, b] });
      throw new Error("unreachable");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("LUGAS_ROUTES_001");
      const message = (error as Error).message;
      expect(message).toContain("module 'a'");
      expect(message).toContain("module 'b'");
    }
  });

  test("any-method value overlapping explicit methods fails closed at defineApp()", () => {
    const bare = defineModule({ name: "bare", routes: { "/mix": get("any") } }); // bare descriptor -> "*"
    const mapped = defineModule({ name: "mapped", routes: { "/mix": { POST: post("p") } } });

    // Overlap must fail regardless of declaration order.
    for (const modules of [[bare, mapped], [mapped, bare]]) {
      try {
        defineApp({ modules: modules as never });
        throw new Error("unreachable");
      } catch (error) {
        expect((error as { code?: string }).code).toBe("LUGAS_ROUTES_001");
        expect((error as Error).message).toContain("/mix");
      }
    }
  });

  test("native function overlapping explicit methods also fails closed", () => {
    const fnModule = defineModule({ name: "fn", routes: { "/fn-mix": (request: Request) => new Response("fn") } });
    const mapped = defineModule({ name: "mapped", routes: { "/fn-mix": { GET: get("g") } } });
    expect(() => defineApp({ modules: [fnModule, mapped] })).toThrow(/\/fn-mix/);
  });

  test("two any-method values on one path remain fatal", () => {
    const r1 = defineModule({ name: "r1", routes: { "/two": new Response("one") } });
    const r2 = defineModule({ name: "r2", routes: { "/two": new Response("two") } });
    expect(() => defineApp({ modules: [r1, r2] })).toThrow(/duplicate route/);
  });

  test("merged map includes native Response values alongside descriptors", async () => {
    const natives = defineModule({ name: "natives", routes: { "/n": { GET: new Response("native-get") } } });
    const app = defineApp({
      routes: { "/n": { POST: post("desc-post") } },
      modules: [natives],
    });
    const server = app.serve({ port: 0, development: false });
    try {
      expect(await surface(server, "GET", "/n")).toEqual({ status: 200, body: "native-get" });
      expect(await surface(server, "POST", "/n")).toEqual({ status: 200, body: "desc-post" });
    } finally {
      server.stop(true);
    }
  });

  test("json helper responses survive merging through live dispatch", async () => {
    const mod = defineModule({
      name: "api",
      routes: {
        "/api": {
          GET: route({ handler: () => json(200, { via: "get" }) }),
          POST: route({ handler: () => json(201, { via: "post" }) }),
        },
      },
    });
    const app = defineApp({ modules: [mod] });
    const server = app.serve({ port: 0, development: false });
    try {
      const g = (await (await fetch(`${server.url}api`)).json()) as { via: string };
      const p = (await (await fetch(`${server.url}api`, { method: "POST" })).json()) as { via: string };
      expect(g.via).toBe("get");
      expect(p.via).toBe("post");
    } finally {
      server.stop(true);
    }
  });
});
