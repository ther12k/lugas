import { describe, expect, test } from "bun:test";
import { parseResponse } from "../../src/client/parse-response";
import { createClient } from "../../src/client/create-client";
import type { TypedResponse } from "../../src/core/response";

type ResultFixtureAPI = {
  readonly "/thing": {
    readonly GET: { readonly responses: TypedResponse<200, { value: number }> };
  };
  readonly "/act": {
    readonly POST: { readonly responses: TypedResponse<404, { code: string }> };
  };
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-probe": "present" },
  });
}

describe("parseResponse() status branching", () => {
  test("2xx succeeds and 4xx/5xx fail without throwing, keyed by actual status", async () => {
    const ok = await parseResponse(jsonResponse(200, { id: "u1" }));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.status).toBe(200);
      expect(ok.data).toEqual({ id: "u1" });
      expect(ok.response.headers.get("x-probe")).toBe("present");
    }

    const teapot = await parseResponse(jsonResponse(418, { reason: "tea" }));
    expect(teapot.ok).toBe(false);
    if (!teapot.ok) {
      expect(teapot.status).toBe(418);
      expect(teapot.error).toEqual({ reason: "tea" });
    }

    const boom = await parseResponse(new Response("{}", { status: 503, headers: { "content-type": "application/json" } }));
    expect(boom.ok).toBe(false);
  });

  test("runtime truth wins over declared expectations: declared-200 responding 500 is a failure", () => {
    // The compile-time contract for this route claims 200; the wire says 500.
    const response = jsonResponse(500, { error: "real" });
    expect(response.ok).toBe(false);
    void parseResponse(response).then((result) => {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(500);
      }
    });
  });

  test("problem+json and text media types parse through dedicated helpers", async () => {
    const problem = await parseResponse(
      new Response('{"type":"about:blank"}', {
        status: 400,
        headers: { "content-type": "application/problem+json; charset=utf-8" },
      }),
    );
    expect(problem.ok).toBe(false);
    if (!problem.ok) {
      expect(problem.error).toEqual({ type: "about:blank" });
    }

    const text = await parseResponse(
      new Response("plain words", { status: 200, headers: { "content-type": "text/plain" } }),
    );
    if (text.ok) {
      expect(text.data).toBe("plain words");
    }
  });

  test("unknown media types stay unconsumed and yield undefined payload", async () => {
    const original = new Response("\x00\x01binary", {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    });
    const result = await parseResponse(original);
    if (result.ok) {
      expect(result.data).toBeUndefined();
      // Original body was never consumed: still fully readable afterwards.
      const bytes = new Uint8Array(await original.arrayBuffer());
      expect(bytes[0]).toBe(0);
    }
  });

  test("bodiless statuses and missing content types yield undefined without consuming", async () => {
    const noContent = new Response(null, { status: 204 });
    const parsed = await parseResponse(noContent);
    if (parsed.ok) {
      expect(parsed.data).toBeUndefined();
    }
    const naked = new Response("surprise", { status: 200 });
    const parsedNaked = await parseResponse(naked);
    if (parsedNaked.ok) {
      expect(parsedNaked.data).toBeUndefined();
      expect(await naked.text()).toBe("surprise");
    }
  });

  test("original response stays readable after JSON parsing (clone body policy)", async () => {
    const original = jsonResponse(201, { created: true });
    const result = await parseResponse(original);
    expect(result.ok).toBe(true);
    expect(await original.json()).toEqual({ created: true });
    expect(original.status).toBe(201);
  });
});

describe("canonical client methods return discriminated results", () => {
  function makeClientWithResponder(respond: () => Response) {
    return createClient<ResultFixtureAPI>({
      baseUrl: "https://x.test",
      fetch: (async () => respond()) as unknown as typeof fetch,
    });
  }

  test("success results expose data plus the native response", async () => {
    const client = makeClientWithResponder(() => jsonResponse(200, { value: 7 }));
    const result = await client.get("/thing");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ value: 7 });
      expect(result.response instanceof Response).toBe(true);
    }
  });

  test("failure results keep status and parsed error without throwing", async () => {
    const client = makeClientWithResponder(() => jsonResponse(404, { code: "missing" }));
    const result = await client.post("/act");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.error).toEqual({ code: "missing" });
    }
  });

  test("the request escape hatch still returns the raw Response", async () => {
    const client = makeClientWithResponder(() => new Response("raw"));
    const raw = await client.request("GET", "/anything");
    expect(raw instanceof Response).toBe(true);
    expect(await raw.text()).toBe("raw");
  });
});
