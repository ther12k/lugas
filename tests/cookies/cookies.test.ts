/**
 * Cookie primitive behavior tests (M9-002, ADR-0027).
 *
 * parseCookies: RFC 6265 §5.4 leniency — malformed input is skipped, never
 * thrown. cookie(): strict serialization with fail-closed diagnostics
 * (LUGAS_COOKIE_001/002) and multi-Set-Cookie composition through the typed
 * response helpers, verified over a real server.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, json, route } from "../../src/index";
import { cookie, parseCookies } from "../../src/core/cookies";
import { createTestServer } from "../../src/testing";

describe("parseCookies", () => {
  test("parses simple pairs", () => {
    const req = new Request("https://x.test/", { headers: { cookie: "a=1; b=2" } });
    expect(parseCookies(req)).toEqual({ a: "1", b: "2" });
  });

  test("returns {} without a cookie header", () => {
    expect(parseCookies(new Request("https://x.test/"))).toEqual({});
  });

  test("preserves quoting and inner whitespace-free encoding", () => {
    const req = new Request("https://x.test/", { headers: { cookie: 'quoted="v"; encoded=a%20b' } });
    expect(parseCookies(req)).toEqual({ quoted: '"v"', encoded: "a%20b" });
  });

  test("last-wins on duplicated names (RFC 6265 sender rules)", () => {
    const req = new Request("https://x.test/", { headers: { cookie: "a=1; a=2" } });
    expect(parseCookies(req)).toEqual({ a: "2" });
  });

  test("skips malformed pairs without throwing", () => {
    const req = new Request("https://x.test/", { headers: { cookie: "=novalue; ; lone; ok=1; $reserved=skip; ==" } });
    expect(parseCookies(req)).toEqual({ ok: "1", lone: "" });
  });

  test("valueless names parse to empty string", () => {
    const req = new Request("https://x.test/", { headers: { cookie: "flag" } });
    expect(parseCookies(req)).toEqual({ flag: "" });
  });
});

describe("cookie() serialization", () => {
  test("name=value alone", () => {
    expect(cookie("session", "abc")).toBe("session=abc");
  });

  test("all attributes in canonical order", () => {
    const out = cookie("s", "v", {
      maxAge: 3600,
      expires: new Date(Date.UTC(2027, 0, 2, 3, 4, 5)),
      domain: "example.com",
      path: "/app",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      partitioned: true,
    });
    expect(out).toBe("s=v; Max-Age=3600; Expires=Sat, 02 Jan 2027 03:04:05 GMT; Domain=example.com; Path=/app; Secure; HttpOnly; SameSite=Lax; Partitioned");
  });

  test("negative maxAge expires the cookie", () => {
    expect(cookie("gone", "x", { maxAge: -1 })).toBe("gone=x; Max-Age=-1");
  });

  test("quoted values pass through", () => {
    expect(cookie("q", '"quoted"')).toBe('q="quoted"');
  });

  test("LUGAS_COOKIE_001 on invalid name tokens", () => {
    expect(() => cookie("bad name", "v")).toThrow();
    expect(() => cookie("semi;name", "v")).toThrow();
    expect(() => cookie("", "v")).toThrow();
    try {
      cookie("bad name", "v");
      expect.unreachable();
    } catch (err) {
      expect((err as { code?: string }).code).toBe("LUGAS_COOKIE_001");
    }
  });

  test("LUGAS_COOKIE_001 on invalid value tokens", () => {
    expect(() => cookie("ok", "has space")).toThrow();
    expect(() => cookie("ok", "semi;colon")).toThrow();
    expect(() => cookie("ok", "comma,")).toThrow();
    expect(() => cookie("ok", 'unbalanced"')).toThrow();
  });

  test("LUGAS_COOKIE_002 on sameSite none without secure", () => {
    try {
      cookie("ok", "v", { sameSite: "none" });
      expect.unreachable();
    } catch (err) {
      expect((err as { code?: string }).code).toBe("LUGAS_COOKIE_002");
    }
    expect(cookie("ok", "v", { sameSite: "none", secure: true })).toBe("ok=v; Secure; SameSite=None");
  });

  test("LUGAS_COOKIE_002 on malformed attributes", () => {
    expect(() => cookie("ok", "v", { path: "" })).toThrow();
    expect(() => cookie("ok", "v", { domain: 5 as unknown as string })).toThrow();
    expect(() => cookie("ok", "v", { maxAge: 1.5 })).toThrow();
    expect(() => cookie("ok", "v", { maxAge: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => cookie("ok", "v", { expires: new Date("nope") })).toThrow();
    expect(() => cookie("ok", "v", { sameSite: "always" as unknown as "lax" })).toThrow();
    expect(() => cookie("ok", "v", null as unknown as undefined)).toThrow();
  });
});

describe("composition with typed response helpers (real server)", () => {
  test("multiple Set-Cookie headers survive through json()", async () => {
    const app = defineApp({
      routes: {
        "/login": {
          POST: route({
            handler: () =>
              json(200, { ok: true }, {
                headers: [
                  ["set-cookie", cookie("session", "tok", { httpOnly: true, sameSite: "lax", path: "/" })],
                  ["set-cookie", cookie("theme", "dark", { path: "/" })],
                ] as [string, string][],
              }),
          }),
        },
      },
    });
    const server = createTestServer(app);
    try {
      const res = await server.fetch("/login", { method: "POST" });
      expect(res.status).toBe(200);
      const set = res.headers.getSetCookie();
      expect(set).toHaveLength(2);
      expect(set[0]).toBe("session=tok; Path=/; HttpOnly; SameSite=Lax");
      expect(set[1]).toBe("theme=dark; Path=/");
    } finally {
      await server.stop();
    }
  });

  test("guard reads cookies with parseCookies and enriches context", async () => {
    const { guard } = await import("../../src/index");
    const sessionGuard = guard({
      name: "session",
      handler: ({ request }) => {
        const cookies = parseCookies(request);
        const token = cookies["session"];
        return token ? { sessionToken: token } : json(401, { error: "no session" });
      },
    });
    const app = defineApp({
      routes: {
        "/me": {
          GET: route({
            before: [sessionGuard],
            handler: (ctx) => json(200, { token: ctx.sessionToken }),
          }),
        },
      },
    });
    const server = createTestServer(app);
    try {
      const ok = await server.fetch("/me", { headers: { cookie: "session=tok123; other=1" } });
      expect(ok.status).toBe(200);
      expect(await ok.json()).toEqual({ token: "tok123" });

      const denied = await server.fetch("/me");
      expect(denied.status).toBe(401);
    } finally {
      await server.stop();
    }
  });
});
