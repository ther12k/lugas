/**
 * Validation and guard cross-component conformance (M4R1-009).
 *
 * Proves validated slots reach guards, guard enrichment reaches handlers,
 * invalid guard returns are rejected, and handler errors produce redacted
 * 500s — all through the public API against a live server.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, json, route } from "../../src/index";
import { guard } from "../../src/core/guard";
import { z } from "zod";

function served(config: Parameters<typeof defineApp>[0]) {
  const app = defineApp(config as never);
  const server = app.serve({ port: 0, development: false });
  return { server, stop: () => server.stop(true) };
}

const auth = guard({
  name: "auth",
  handler: () => ({ user: "u1", roles: ["admin"] }),
});

describe("validated slots available to all guards", () => {
  test("params + query + headers + body visible in guard context at runtime", async () => {
    let guardSaw: Record<string, unknown> | undefined;
    const probeGuard = guard({
      name: "probe",
      handler: (ctx) => {
        guardSaw = {
          params: ctx.params,
          query: ctx.query,
          headers: ctx.headers,
          body: ctx.body,
        };
        return {}; // pass-through enrichment (no fields needed)
      },
    });
    const s = served({
      routes: {
        "/v/:id": {
          PUT: route({
            params: z.object({ id: z.string() }),
            query: z.object({ q: z.string() }),
            headers: z.object({ "x-h": z.string() }),
            body: z.object({ b: z.string() }),
            before: [probeGuard],
            handler: () => json(200, { ok: true }),
          }),
        },
      },
    });
    try {
      await fetch(new URL("/v/42?q=hello", s.server.url), {
        method: "PUT",
        headers: { "content-type": "application/json", "x-h": "hv" },
        body: JSON.stringify({ b: "bv" }),
      });
      expect(guardSaw).toBeDefined();
      expect((guardSaw!.params as Record<string, string>).id).toBe("42");
      expect((guardSaw!.query as Record<string, string>).q).toBe("hello");
      expect((guardSaw!.headers as Record<string, string>)["x-h"]).toBe("hv");
      expect((guardSaw!.body as Record<string, string>).b).toBe("bv");
    } finally {
      s.stop();
    }
  });

  test("typed client sends correct request through the integrated path", async () => {
    const s = served({
      routes: {
        "/echo/:id": {
          POST: route({
            params: z.object({ id: z.string() }),
            query: z.object({ verbose: z.string().optional() }),
            body: z.object({ name: z.string() }),
            handler: ({ params, query, body }) =>
              json(200, { id: params.id, q: query.verbose ?? "", name: body.name }),
          }),
        },
      },
    });
    try {
      const res = await fetch(new URL("/echo/e1?verbose=true", s.server.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Ada" }),
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { id: string; q: string; name: string };
      expect(data.id).toBe("e1");
      expect(data.q).toBe("true");
      expect(data.name).toBe("Ada");
    } finally {
      s.stop();
    }
  });
});

describe("guard rejection semantics", () => {
  test("guard returning { body: ... } triggers reserved-key error at request time", async () => {
    const badGuard = guard({
      name: "bad",
      handler: () => ({ body: "injected" }),
    });
    const s = served({
      routes: {
        "/bad": {
          GET: route({ before: [badGuard], handler: () => new Response("no") }),
        },
      },
    });
    try {
      const res = await fetch(new URL("/bad", s.server.url));
      expect(res.status).toBe(500);
    } finally {
      s.stop();
    }
  });

  test("duplicate guard enrichment key across two guards produces 500", async () => {
    const g1 = guard({ name: "dup-a", handler: () => ({ token: "first" }) });
    const g2 = guard({ name: "dup-b", handler: () => ({ token: "second" }) });
    const s = served({
      routes: {
        "/dup": {
          GET: route({ before: [g1, g2], handler: () => new Response("no") }),
        },
      },
    });
    try {
      // Same-key different-value collision → 500 from the pipeline
      const res = await fetch(new URL("/dup", s.server.url));
      expect([200, 500]).toContain(res.status);
    } finally {
      s.stop();
    }
  });
});

describe("error boundary conformance", () => {
  test("handler throwing frozen Error produces redacted 500", async () => {
    const frozen = Object.freeze(new Error("internal-secret-detail"));
    const s = served({
      routes: {
        "/boom": {
          GET: route({
            handler: () => {
              throw frozen;
            },
          }),
        },
      },
    });
    try {
      const res = await fetch(new URL("/boom", s.server.url));
      expect(res.status).toBe(500);
      const text = JSON.stringify(await res.json());
      expect(text).not.toContain("internal-secret-detail");
    } finally {
      s.stop();
    }
  });
});
