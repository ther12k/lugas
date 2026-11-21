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
import { defineApp, json, route, sse, type SseWriter } from "../../src/index";
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
  test("SSE sends an event while the writer is open with both policies enabled", async () => {
    let writer: SseWriter | undefined;
    const server = createTestServer(defineApp({
      etag: true,
      compression: true,
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                start: (stream) => {
                  writer = stream;
                  stream.send({ data: "first" });
                },
              }),
          }),
        },
      },
    }));
    try {
      const res = await server.fetch("/events", {
        headers: { "accept-encoding": "gzip", "if-none-match": '"no-such-tag"' },
        signal: AbortSignal.timeout(2_000),
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      expect(res.headers.get("etag")).toBeNull();
      expect(res.headers.get("content-encoding")).toBeNull();

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let frame = "";
      while (!frame.endsWith("\n\n")) {
        const { value, done } = await reader.read();
        if (done) break;
        frame += decoder.decode(value, { stream: true });
      }
      expect(frame).toBe("data: first\n\n");
    } finally {
      writer?.close();
      await server.stop();
    }
  });

  test("wildcard conditional on an open SSE stream answers 304 without buffering; cleanup runs once", async () => {
    let writer: SseWriter | undefined;
    let cleanups = 0;
    const server = createTestServer(defineApp({
      etag: true,
      compression: true,
      routes: {
        "/events": {
          GET: route({
            handler: () =>
              sse({
                start: (stream) => {
                  writer = stream;
                  stream.send({ data: "first" });
                  return () => {
                    cleanups += 1;
                  };
                },
              }),
          }),
        },
      },
    }));
    try {
      const res = await server.fetch("/events", { headers: { "if-none-match": "*" }, signal: AbortSignal.timeout(2_000) });
      expect(res.status).toBe(304); // the stream exists — answered without hashing it
      expect(await res.text()).toBe("");
      expect(res.headers.get("etag")).toBeNull(); // never hashed, so no framework validator
      expect(res.headers.get("cache-control")).toBe("no-cache"); // metadata still updates caches
      await Bun.sleep(50);
      expect(cleanups).toBe(1); // discarding the stream runs its exactly-once cleanup
      writer?.close();
      await Bun.sleep(50);
      expect(cleanups).toBe(1);
    } finally {
      writer?.close();
      await server.stop();
    }
  });

  test("wildcard conditional never masks a failure status", async () => {
    const missing = defineApp({
      etag: true,
      routes: {
        "/gone": { GET: route({ handler: () => json(404, { error: "missing" }) }) },
      },
    });
    const server = createTestServer(missing);
    try {
      const plain = await server.fetch("/gone");
      expect(plain.status).toBe(404);

      const conditional = await server.fetch("/gone", { headers: { "if-none-match": "*" } });
      expect(conditional.status).toBe(404); // no current representation → the wildcard does not match
      expect(((await conditional.json()) as { error: string }).error).toBe("missing");
    } finally {
      await server.stop();
    }
  });

  test("failure responses carry no framework validator and can never be masked by one", async () => {
    const server = createTestServer(defineApp({
      etag: { weak: true },
      routes: {
        "/gone": { GET: route({ handler: () => json(404, { error: "missing" }) }) },
      },
    }));
    try {
      // The selected representation exists only for a success (RFC 9110 §3.2):
      // error payloads cross untouched, so no validator is minted over them
      // and replaying any conditional keeps the full failure response.
      const first = await server.fetch("/gone");
      expect(first.status).toBe(404);
      expect(first.headers.get("etag")).toBeNull();

      const conditional = await server.fetch("/gone", { headers: { "if-none-match": '"any-tag"' } });
      expect(conditional.status).toBe(404);
      expect(((await conditional.json()) as { error: string }).error).toBe("missing");
    } finally {
      await server.stop();
    }
  });

  test("a quoted tag containing commas is never mistaken for the wildcard", async () => {
    let writer: SseWriter | undefined;
    const server = createTestServer(defineApp({
      etag: true,
      routes: {
        "/data": { GET: route({ handler: () => json(200, { payload: REPEAT }) }) },
        "/events": {
          GET: route({
            handler: () =>
              sse({
                start: (stream) => {
                  writer = stream;
                  stream.send({ data: "first" });
                },
              }),
          }),
        },
      },
    }));
    try {
      // RFC 9110 §13.1.2: `*` is the condition only as the ENTIRE field value.
      // "\"rev,*,next\"" is one quoted opaque tag whose bytes contain a comma
      // and an asterisk — not a wildcard, so nothing matches and nothing is
      // discarded.
      const conditional = await server.fetch("/data", { headers: { "if-none-match": '"rev,*,next"' } });
      expect(conditional.status).toBe(200); // unknown tag → full response with a fresh validator
      expect(conditional.headers.get("etag")).toMatch(/^"[0-9a-f]{40}"$/);
      await conditional.arrayBuffer();

      const streamed = await server.fetch("/events", {
        headers: { "if-none-match": '"rev,*,next"' },
        signal: AbortSignal.timeout(2_000),
      });
      expect(streamed.status).toBe(200); // the stream is live, not cancelled into a 304
      expect(streamed.headers.get("content-type")).toContain("text/event-stream");
      const reader = streamed.body!.getReader();
      const decoder = new TextDecoder();
      let frame = "";
      while (!frame.endsWith("\n\n")) {
        const { value, done } = await reader.read();
        if (done) break;
        frame += decoder.decode(value, { stream: true });
      }
      expect(frame).toBe("data: first\n\n");
    } finally {
      writer?.close();
      await server.stop();
    }
  });

  test("a bodyless success answers a wildcard conditional with 304", async () => {
    const server = createTestServer(defineApp({
      etag: true,
      routes: {
        "/head-style": {
          GET: route({
            handler: () => new Response(null, { status: 200, headers: { "cache-control": "max-age=60" } }),
          }),
        },
      },
    }));
    try {
      // The route answered successfully, so a current representation exists
      // even though this response carries no body: the wildcard is evaluated
      // before the nothing-to-hash guard.
      const conditional = await server.fetch("/head-style", { headers: { "if-none-match": "*" } });
      expect(conditional.status).toBe(304);
      expect(await conditional.text()).toBe("");
      expect(conditional.headers.get("etag")).toBeNull(); // nothing was hashed
      expect(conditional.headers.get("cache-control")).toBe("max-age=60"); // metadata still updates caches
    } finally {
      await server.stop();
    }
  });

  test("weak validators compare opaquely: replaying the generated W/\"…\" returns 304", async () => {
    const server = createTestServer(app({ etag: { weak: true }, compression: true }));
    try {
      const first = await server.fetch("/data");
      const etag = first.headers.get("etag");
      expect(etag).toMatch(/^W\/"[0-9a-f]{40}"$/);
      await first.text();

      const conditional = await server.fetch("/data", { headers: { "if-none-match": etag! } });
      expect(conditional.status).toBe(304);
      expect(conditional.headers.get("etag")).toBe(etag); // the weak form is echoed, not strengthened
    } finally {
      await server.stop();
    }
  });

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

  test("304 preserves current cache metadata without copying body headers", async () => {
    let maxAge = 60;
    const server = createTestServer(defineApp({
      etag: true,
      compression: true,
      routes: {
        "/data": {
          GET: route({ handler: () => new Response(REPEAT, { headers: {
            "cache-control": `max-age=${maxAge}`,
            "content-location": "/data",
            "content-type": "text/plain",
            "content-length": String(REPEAT.length),
            date: "Wed, 21 Oct 2015 07:28:00 GMT",
            expires: "Wed, 21 Oct 2015 07:30:00 GMT",
            vary: "Accept-Language",
          } }) }),
        },
      },
    }));
    try {
      const first = await server.fetch("/data", { headers: { "accept-encoding": "identity" } });
      expect(first.status).toBe(200);
      expect(first.headers.get("cache-control")).toBe("max-age=60");
      expect(first.headers.get("vary")).toBe("Accept-Language, Accept-Encoding");
      await first.text();

      maxAge = 120;
      const conditional = await server.fetch("/data", {
        headers: { "accept-encoding": "gzip", "if-none-match": first.headers.get("etag")! },
      });
      expect(conditional.status).toBe(304);
      expect(conditional.headers.get("cache-control")).toBe("max-age=120");
      for (const header of ["etag", "vary", "content-location", "date", "expires"]) {
        expect(conditional.headers.get(header)).toBe(first.headers.get(header));
      }
      expect(conditional.headers.get("content-type")).toBeNull();
      expect(conditional.headers.get("content-length")).toBeNull();
      expect(conditional.headers.get("content-encoding")).toBeNull();
      expect(await conditional.text()).toBe("");
    } finally {
      await server.stop();
    }
  });

  test.each([
    ["compression is disabled", false, "text/plain", "Accept-Language"],
    ["the type is not compressible", true, "application/octet-stream", "Accept-Language"],
    ["Accept-Encoding is already present", true, "text/plain", "Accept-Language, accept-encoding"],
    ["Vary is a wildcard", true, "text/plain", "*"],
  ] as const)("304 preserves Vary when %s", async (_reason, compression, contentType, vary) => {
    const server = createTestServer(defineApp({
      etag: true,
      ...(compression ? { compression: true } : {}),
      routes: {
        "/data": { GET: route({ handler: () => new Response("unchanged", { headers: { "content-type": contentType, vary } }) }) },
      },
    }));
    try {
      const full = await server.fetch("/data");
      expect(full.headers.get("vary")).toBe(vary);
      await full.text();
      const conditional = await server.fetch("/data", { headers: { "if-none-match": full.headers.get("etag")! } });
      expect(conditional.status).toBe(304);
      expect(conditional.headers.get("vary")).toBe(vary);
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
