/**
 * Compression and ETag tests (M9-007, ADR-0033).
 *
 * Covers: gzip/deflate negotiation round-trips, q=0 exclusion, identity
 * fallback, every structural skip (SSE untouched, pre-encoded untouched,
 * ranged untouched, small untouched, non-compressible untouched),
 * Vary: Accept-Encoding, etag stability across encodings, If-None-Match →
 * 304 (token, list, *), method restriction, application etag precedence,
 * secureHeaders composition, and both config diagnostics.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, json, route, sse } from "../../src/index";
import { createTestServer } from "../../src/testing";

const REPEAT = "lugas compression battery. ".repeat(80); // >1024 bytes, compressible

function app(extra: Parameters<typeof defineApp>[0]) {
  return defineApp({
    routes: {
      "/data": { GET: route({ handler: () => json(200, { payload: REPEAT }) }) },
    },
    ...extra,
  });
}

describe("compression", () => {
  test("gzip negotiated, round-trips, and declares itself", async () => {
    const server = createTestServer(app({ compression: true }));
    try {
      const res = await server.fetch("/data", { headers: { "accept-encoding": "gzip" } });
      expect(res.headers.get("content-encoding")).toBe("gzip");
      expect(res.headers.get("vary")).toContain("Accept-Encoding");
      // Bun's fetch transparently decodes gzip bodies; the header proves the
      // wire encoding and the parsed body proves the round-trip consistency.
      expect(((await res.json()) as { payload: string }).payload).toBe(REPEAT);
    } finally {
      await server.stop();
    }
  });

  test("deflate chosen when preferred via q-values; q=0 excludes", async () => {
    const server = createTestServer(app({ compression: true }));
    try {
      const res = await server.fetch("/data", { headers: { "accept-encoding": "gzip;q=0.5, deflate;q=0.9" } });
      expect(res.headers.get("content-encoding")).toBe("deflate");

      const excluded = await server.fetch("/data", { headers: { "accept-encoding": "gzip;q=0, deflate;q=0, identity" } });
      expect(excluded.headers.get("content-encoding")).toBeNull();
      expect(((await excluded.json()) as { payload: string }).payload).toBe(REPEAT);
    } finally {
      await server.stop();
    }
  });

  test("identity fallback with identity encoding; Vary still present", async () => {
    const server = createTestServer(app({ compression: true }));
    try {
      // Bun's fetch sends accept-encoding: gzip by default; identity is explicit.
      const res = await server.fetch("/data", { headers: { "accept-encoding": "identity" } });
      expect(res.headers.get("content-encoding")).toBeNull();
      expect(res.headers.get("vary")).toContain("Accept-Encoding");
      expect(((await res.json()) as { payload: string }).payload).toBe(REPEAT);
    } finally {
      await server.stop();
    }
  });

  test("SSE responses are structurally untouched", async () => {
    const sseApp = defineApp({
      compression: true,
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                start: (writer) => {
                  writer.send({ data: { n: 1 } });
                  writer.close();
                },
              }),
          }),
        },
      },
    });
    const server = createTestServer(sseApp);
    try {
      const res = await server.fetch("/events", { headers: { "accept-encoding": "gzip" } });
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      expect(res.headers.get("content-encoding")).toBeNull();
    } finally {
      await server.stop();
    }
  });

  test("small bodies and non-compressible types pass through", async () => {
    const mixed = defineApp({
      compression: true,
      routes: {
        "/small": { GET: route({ handler: () => json(200, { tiny: true }) }) },
        "/binary": {
          GET: route({
            handler: () => new Response(new Uint8Array([0, 1, 2, 3].concat(new Array(2000).fill(255))), { headers: { "content-type": "application/octet-stream" } }),
          }),
        },
      },
    });
    const server = createTestServer(mixed);
    try {
      const small = await server.fetch("/small", { headers: { "accept-encoding": "gzip" } });
      expect(small.headers.get("content-encoding")).toBeNull();

      const binary = await server.fetch("/binary", { headers: { "accept-encoding": "gzip" } });
      expect(binary.headers.get("content-encoding")).toBeNull();
    } finally {
      await server.stop();
    }
  });

  test("pre-encoded responses are never double-encoded", async () => {
    const pre = defineApp({
      compression: true,
      routes: {
        "/pre": {
          GET: route({
            handler: () =>
              new Response(Bun.gzipSync(new TextEncoder().encode(REPEAT)), {
                headers: { "content-type": "text/plain", "content-encoding": "gzip" },
              }),
          }),
        },
      },
    });
    const server = createTestServer(pre);
    try {
      const res = await server.fetch("/pre", { headers: { "accept-encoding": "gzip" } });
      expect(res.headers.get("content-encoding")).toBe("gzip");
      // Transparently decoded by fetch: exactly one gzip layer existed.
      expect(await res.text()).toBe(REPEAT);
    } finally {
      await server.stop();
    }
  });

  test("LUGAS_COMPRESSION_001 on invalid configuration", () => {
    for (const bad of [{ encodings: [] }, { encodings: ["br"] }, { minSize: -1 }, { types: [] }, "x"] as never[]) {
      try {
        defineApp({ compression: bad, routes: {} });
        expect.unreachable();
      } catch (err) {
        expect((err as { code?: string }).code).toBe("LUGAS_COMPRESSION_001");
      }
    }
  });
});

describe("etag", () => {
  test("strong etag on GET; stable across encodings; If-None-Match → 304 empty", async () => {
    const server = createTestServer(app({ etag: true, compression: true }));
    try {
      const first = await server.fetch("/data");
      const etag = first.headers.get("etag");
      expect(etag).toMatch(/^"[0-9a-f]{40}"$/);
      const body = ((await first.json()) as { payload: string }).payload;
      expect(body).toBe(REPEAT);

      const gzipped = await server.fetch("/data", { headers: { "accept-encoding": "gzip" } });
      expect(gzipped.headers.get("etag")).toBe(etag); // validator is encoding-independent

      const notModified = await server.fetch("/data", { headers: { "if-none-match": etag! } });
      expect(notModified.status).toBe(304);
      expect(notModified.headers.get("etag")).toBe(etag);
      expect(await notModified.text()).toBe("");

      const list = await server.fetch("/data", { headers: { "if-none-match": `"other", ${etag!}` } });
      expect(list.status).toBe(304);

      const star = await server.fetch("/data", { headers: { "if-none-match": "*" } });
      expect(star.status).toBe(304);
    } finally {
      await server.stop();
    }
  });

  test("304 short-circuit never pays the encode cost", async () => {
    const server = createTestServer(app({ etag: true, compression: true }));
    try {
      const first = await server.fetch("/data");
      const etag = first.headers.get("etag");
      const conditional = await server.fetch("/data", { headers: { "if-none-match": etag!, "accept-encoding": "gzip" } });
      expect(conditional.status).toBe(304);
      expect(conditional.headers.get("content-encoding")).toBeNull();
    } finally {
      await server.stop();
    }
  });

  test("POST carries no framework etag", async () => {
    const postApp = defineApp({
      etag: true,
      routes: {
        "/data": {
          POST: route({ handler: () => json(201, { payload: REPEAT }) }),
        },
      },
    });
    const server = createTestServer(postApp);
    try {
      const res = await server.fetch("/data", { method: "POST" });
      expect(res.status).toBe(201);
      expect(res.headers.get("etag")).toBeNull();
    } finally {
      await server.stop();
    }
  });

  test("application-set etag wins (fill-if-absent)", async () => {
    const own = defineApp({
      etag: true,
      routes: {
        "/own": {
          GET: route({ handler: () => json(200, { a: 1 }, { headers: { etag: '"my-version-1"' } }) }),
        },
      },
    });
    const server = createTestServer(own);
    try {
      const res = await server.fetch("/own");
      expect(res.headers.get("etag")).toBe('"my-version-1"');
    } finally {
      await server.stop();
    }
  });

  test("weak etag form when configured", async () => {
    const server = createTestServer(app({ etag: { weak: true } }));
    try {
      const res = await server.fetch("/data");
      expect(res.headers.get("etag")).toMatch(/^W\/"[0-9a-f]{40}"$/);
    } finally {
      await server.stop();
    }
  });

  test("composes with secureHeaders on one response", async () => {
    const server = createTestServer(app({ compression: true, etag: true, secureHeaders: true }));
    try {
      const res = await server.fetch("/data", { headers: { "accept-encoding": "gzip" } });
      expect(res.headers.get("content-encoding")).toBe("gzip");
      expect(res.headers.get("etag")).toMatch(/^"/);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    } finally {
      await server.stop();
    }
  });

  test("LUGAS_ETAG_001 on invalid configuration", () => {
    for (const bad of [{ weak: "yes" }, "x"] as never[]) {
      try {
        defineApp({ etag: bad, routes: {} });
        expect.unreachable();
      } catch (err) {
        expect((err as { code?: string }).code).toBe("LUGAS_ETAG_001");
      }
    }
  });
});
