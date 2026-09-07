import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json, text } from "../../src/core/response";

/**
 * M7-002 — delegated body-limit behavior, pinned per fixture.
 *
 * Fixture classification (each expectation is tied to what the fixture
 * actually sends — see docs/body-limits.md and ADR-0019's hardening split):
 *
 * | fixture                                    | sends                          | expected |
 * |--------------------------------------------|--------------------------------|----------|
 * | well-formed oversized JSON                 | Content-Length > ceiling       | bare 413, empty body (Bun transport rejection) |
 * | exact-boundary JSON                        | Content-Length == ceiling      | 200 (ceiling is inclusive) |
 * | streamed, no Content-Length, over ceiling  | chunked, total bytes > ceiling | bare 413 (byte-counted, header-independent) |
 * | streamed, no Content-Length, under ceiling | chunked, total bytes <= ceiling| 200 |
 * | client abort mid-body                      | body never completes           | client-side AbortError; handler never runs; no fabricated response |
 * | malformed JSON (separate case)             | syntactically broken, small    | Lugas 400 Problem Details — NOT a transport 413 |
 *
 * The bare `413` assertion applies ONLY to the well-formed oversized
 * fixtures that demonstrably produce it. Malformed framing and transport
 * interruptions keep their own expectations — there is deliberately no
 * Problem Details normalization of the transport rejection (ADR-0019).
 */
describe("Request body limits & oversize payload security (M7-002)", () => {
  const CEILING = 32;
  let handlerRuns = 0;

  function appWithCountingHandler() {
    handlerRuns = 0;
    return defineApp({
      routes: {
        "/upload": {
          POST: route({
            body: z.object({ data: z.string() }),
            handler: (ctx) => {
              handlerRuns += 1;
              return json(200, { received: ctx.body.data.length });
            },
          }),
        },
      },
    });
  }

  /** ASCII JSON body of exactly `n` bytes: {"data":"xx…x"} */
  function jsonBodyOfLength(n: number): string {
    const overhead = Buffer.byteLength(`{"data":""}`);
    if (n < overhead) throw new Error(`fixture misuse: ${n} < minimum ${overhead}`);
    const body = `{"data":"${"x".repeat(n - overhead)}"}`;
    if (Buffer.byteLength(body) !== n) throw new Error(`fixture misuse: crafted ${Buffer.byteLength(body)} != ${n}`);
    return body;
  }

  function post(server: Bun.Server<unknown>, body: string | ReadableStream) {
    const init: RequestInit & { duplex?: string } = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    };
    if (typeof body !== "string") init.duplex = "half";
    return fetch(`http://localhost:${server.port}/upload`, init);
  }

  function chunked(bytes: Uint8Array): ReadableStream {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  test("well-formed oversized request: bare 413, empty body, handler never runs", async () => {
    const app = appWithCountingHandler();
    const server = app.serve({ port: 0, development: false, maxRequestBodySize: CEILING });
    try {
      const small = await post(server, jsonBodyOfLength(CEILING - 2));
      expect(small.status).toBe(200);
      expect(handlerRuns).toBe(1);

      const large = await post(server, jsonBodyOfLength(CEILING + 7));
      expect(large.status).toBe(413);
      expect(await large.text()).toBe("");
      expect(handlerRuns).toBe(1); // rejected before handler execution
    } finally {
      server.stop(true);
    }
  });

  test("exact-boundary request: a body of exactly maxRequestBodySize bytes is accepted", async () => {
    const app = appWithCountingHandler();
    const server = app.serve({ port: 0, development: false, maxRequestBodySize: CEILING });
    try {
      const atLimit = await post(server, jsonBodyOfLength(CEILING));
      expect(atLimit.status).toBe(200);
      expect(handlerRuns).toBe(1);
    } finally {
      server.stop(true);
    }
  });

  test("streamed request without Content-Length is byte-counted by the transport ceiling", async () => {
    const app = appWithCountingHandler();
    const server = app.serve({ port: 0, development: false, maxRequestBodySize: CEILING });
    try {
      const over = await post(server, chunked(new TextEncoder().encode(jsonBodyOfLength(CEILING + 8))));
      expect(over.status).toBe(413);
      expect(handlerRuns).toBe(0);

      const under = await post(server, chunked(new TextEncoder().encode(jsonBodyOfLength(CEILING - 2))));
      expect(under.status).toBe(200);
      expect(handlerRuns).toBe(1);
    } finally {
      server.stop(true);
    }
  });

  test("client abort mid-body is a transport failure: client rejected, handler never runs", async () => {
    const app = appWithCountingHandler();
    const server = app.serve({ port: 0, development: false, maxRequestBodySize: CEILING * 16 });
    try {
      const controller = new AbortController();
      const neverCompleting = new ReadableStream({
        start(streamController) {
          streamController.enqueue(new TextEncoder().encode(jsonBodyOfLength(CEILING)));
          // intentionally never closes — the request stays in flight
        },
      });
      const pending = fetch(`http://localhost:${server.port}/upload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: neverCompleting,
        duplex: "half",
        signal: controller.signal,
      } as RequestInit & { duplex: string });
      setTimeout(() => controller.abort(), 40);
      const outcome = await pending.then(
        (r) => `unexpected response ${r.status}`,
        (error: unknown) => (error instanceof Error ? error.name : String(error)),
      );
      expect(outcome).toBe("AbortError");
      await Bun.sleep(80);
      expect(handlerRuns).toBe(0);
    } finally {
      server.stop(true);
    }
  });

  test("malformed JSON is a Lugas 400 Problem Details response, distinct from the transport 413", async () => {
    const app = defineApp({
      routes: {
        "/validate": {
          POST: route({
            body: z.object({ key: z.string() }),
            handler: () => text(200, "ok"),
          }),
        },
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const secretFragment = "super_secret_unclosed_string_payload_12345678";
      const res = await fetch(`http://localhost:${server.port}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: `{"key": "${secretFragment}`,
      });
      expect(res.status).toBe(400);
      const bodyStr = JSON.stringify(await res.json());
      expect(bodyStr).not.toContain(secretFragment);
      expect(bodyStr).toContain("problem"); // RFC 9457 envelope — a Lugas response, unlike the bare 413
    } finally {
      server.stop(true);
    }
  });
});
