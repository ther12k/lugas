/**
 * End-to-end media-type contract (M6R8, #317).
 *
 * The typed client decodes according to the response's actual media type.
 * With the helpers owning their media types (#317 finding 2), the compile
 * time brand and the runtime decode can no longer disagree: this test proves
 * that for every helper, the client-observed value matches both the type the
 * brand promises and the payload the server serialized.
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json, problem, text } from "../../src/core/response";
import { createClient } from "../../src/client/create-client";
import { createTestServer } from "../../src/testing";
import type { AppContract } from "../../src/core/contract";

const app = defineApp({
  routes: {
    "/json-default": {
      GET: route({ handler: () => json(200, { ok: true, n: 1 }) }),
    },
    "/json-suffix-override": {
      GET: route({
        handler: () => json(200, { hal: true }, { headers: { "content-type": "application/vnd.lugas+json" } }),
      }),
    },
    "/text-default": {
      GET: route({ handler: () => text(200, "plain-body") }),
    },
    "/text-html-override": {
      GET: route({ handler: () => text(200, "<b>bold</b>", { headers: { "content-type": "text/html" } }) }),
    },
    "/problem-not-found": {
      GET: route({ handler: () => problem(404, { title: "Not Found", code: "NOPE" }) }),
    },
  },
});

type API = AppContract<typeof app>;

describe("typed body matches the decode under the actual content type", () => {
  test("json() default media type decodes to the branded object", async () => {
    const server = createTestServer(app, { port: 0 });
    const client = createClient<API>({ baseUrl: server.url });
    const result = await client.get("/json-default");
    await server.stop();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data: { ok: boolean; n: number | null } = result.data;
      expect(data).toEqual({ ok: true, n: 1 });
    }
  });

  test("json() +json-subtype override still decodes JSON to the brand", async () => {
    const server = createTestServer(app, { port: 0 });
    const client = createClient<API>({ baseUrl: server.url });
    const result = await client.get("/json-suffix-override");
    await server.stop();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data: { hal: boolean } = result.data;
      expect(data).toEqual({ hal: true });
    }
  });

  test("text() default media type decodes to the branded string", async () => {
    const server = createTestServer(app, { port: 0 });
    const client = createClient<API>({ baseUrl: server.url });
    const result = await client.get("/text-default");
    await server.stop();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data: string = result.data;
      expect(data).toBe("plain-body");
    }
  });

  test("text() text/* override still decodes as text", async () => {
    const server = createTestServer(app, { port: 0 });
    const client = createClient<API>({ baseUrl: server.url });
    const result = await client.get("/text-html-override");
    await server.stop();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data: string = result.data;
      expect(data).toBe("<b>bold</b>");
    }
  });

  test("problem() failures keep their parsed RFC 9457 fields under error", async () => {
    const server = createTestServer(app, { port: 0 });
    const client = createClient<API>({ baseUrl: server.url });
    const result = await client.get("/problem-not-found");
    await server.stop();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const error: { title?: string | undefined } & Record<string, unknown> = result.error;
      expect(error.title).toBe("Not Found");
      expect(error.code).toBe("NOPE");
      expect(result.status).toBe(404);
    }
  });
});
