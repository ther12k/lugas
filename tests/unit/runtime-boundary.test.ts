/**
 * Runtime boundary regression tests (M6R2 #286/#287/#288).
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";

function errCode(fn: () => unknown): { name: string; code?: string | undefined } {
  try {
    fn();
  } catch (error) {
    const e = error as { name?: string; code?: string };
    return { name: e.name ?? "?", code: e.code };
  }
  return { name: "NO-THROW", code: undefined };
}

describe("route-map shape before enumeration (#286)", () => {
  test("null routes → LUGAS_APP_006, not TypeError", () => {
    const e = errCode(() => defineApp({ routes: null } as never));
    expect(e.name).toBe("LugasDiagnosticError");
    expect(e.code).toBe("LUGAS_APP_006");
  });

  test("array routes rejected with the stable diagnostic", () => {
    const e = errCode(() => defineApp({ routes: ["/x"] } as never));
    expect(e.code).toBe("LUGAS_APP_006");
  });

  test("string routes rejected too", () => {
    expect(errCode(() => defineApp({ routes: "/x" } as never)).code).toBe("LUGAS_APP_006");
  });
});

describe("descriptor structural shape (#287)", () => {
  test("guard entry without handler function is rejected at route()", () => {
    const fake = { name: "fake" }; // no handler
    const e = errCode(() =>
      route({ before: [fake as never], handler: () => new Response("x") }),
    );
    expect(e.code).toBe("LUGAS_ROUTE_005");
  });

  test("guard entry with non-function handler rejected", () => {
    const fake = { name: "fake", handler: "not-a-function" };
    expect(
      errCode(() => route({ before: [fake as never], handler: () => new Response("x") })).code,
    ).toBe("LUGAS_ROUTE_005");
  });

  test("real guard() descriptors still accepted", () => {
    expect(() => {
      // import-free inline construction of a legit guard
      const g = {
        name: "ok",
        handler: () => ({ actor: "system" }),
      };
      route({ before: [g as never], handler: () => new Response("x") });
    }).not.toThrow();
  });

  test("module entry missing routes map rejected at defineApp()", () => {
    const e = errCode(() =>
      defineApp({ modules: [{ name: "m" }] } as never),
    );
    expect(e.code).toBe("LUGAS_APP_004");
  });
});

describe("custom notFound fallback parity (#288)", () => {
  async function probe(notFound: unknown): Promise<{ status: number; text: string }> {
    const app = defineApp({
      notFound: notFound as never,
      routes: { "/known": { GET: () => new Response("k") } },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(`${server.url.origin}/missing`);
      return { status: res.status, text: await res.text() };
    } finally {
      server.stop(true);
    }
  }

  test("throwing custom notFound → redacted default 404", async () => {
    const r = await probe(() => {
      throw new Error("POLICY-SECRET");
    });
    expect(r.status).toBe(404);
    expect(r.text).not.toContain("POLICY-SECRET");
  });

  test("non-Response custom notFound → default problem", async () => {
    const r = await probe(() => ({ nope: true }) as unknown as Response);
    expect(r.status).toBe(404);
  });

  test("healthy custom policy keeps control", async () => {
    const r = await probe(() => new Response("custom-404-body", { status: 404 }));
    expect(r.status).toBe(404);
    expect(r.text).toBe("custom-404-body");
  });
});
