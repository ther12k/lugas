import { describe, expect, test } from "bun:test";
import { buildRequestInit, ClientRequestError } from "../../src/client/request";

function captureError(run: () => unknown): ClientRequestError {
  try {
    run();
    throw new Error("expected throw");
  } catch (error) {
    if (error instanceof ClientRequestError) {
      return error;
    }
    throw error;
  }
}

describe("buildRequestInit() ownership rules", () => {
  test("method/body/headers inside platform options are rejected", () => {
    expect(captureError(() => buildRequestInit({ method: "GET", init: { method: "POST" } })).code).toBe(
      "LUGAS_CLIENT_007",
    );
    expect(captureError(() => buildRequestInit({ method: "GET", init: { body: "x" } })).code).toBe(
      "LUGAS_CLIENT_007",
    );
    const headersErr = captureError(() =>
      buildRequestInit({ method: "GET", init: { headers: { a: "1" } } }),
    );
    expect(headersErr.code).toBe("LUGAS_CLIENT_007");
    expect(captureError(() => buildRequestInit({ method: "GET", init: "nope" as never })).code).toBe(
      "LUGAS_CLIENT_007",
    );
  });

  test("non-owned platform options are forwarded unchanged", () => {
    const controller = new AbortController();
    const signal = controller.signal;
    const credentials = "include" as const;
    const built = buildRequestInit({
      method: "GET",
      init: {
        signal,
        credentials,
        redirect: "follow",
        cache: "no-store",
        keepalive: true,
      },
    });
    expect(built.init.signal).toBe(signal);
    expect(built.init.credentials).toBe(credentials);
    expect(built.init.redirect).toBe("follow");
    expect(built.init.cache).toBe("no-store");
    expect(built.init.keepalive).toBe(true);
    expect(built.init.method).toBe("GET");
    expect(built.init.body).toBeUndefined();
  });

  test("abort signal reaches the transport as the identical instance", async () => {
    let received: AbortSignal | null | undefined;
    const controller = new AbortController();
    const transport = (async (_input: string | URL | Request, init?: RequestInit) => {
      received = init?.signal;
      return new Response("ok");
    }) as unknown as typeof fetch;
    const { createClient } = await import("../../src/client/create-client");
    const client = createClient<{ "/x": { GET: unknown } }>({
      baseUrl: "https://x.test",
      fetch: transport,
    });
    await client.get("/x", { init: { signal: controller.signal } });
    expect(received).toBe(controller.signal);
    controller.abort();
    expect(received?.aborted).toBe(true);
  });
});

describe("buildRequestInit() headers", () => {
  test("structured headers land on the single Headers channel", () => {
    const built = buildRequestInit({ method: "GET", headers: { "x-a": "1", "X-B": "2" } });
    const h = new Headers(built.init.headers);
    expect(h.get("x-a")).toBe("1");
    expect(h.get("x-b")).toBe("2");
  });

  test("header validation rejects non-strings, line breaks, and bad shapes", () => {
    expect(captureError(() => buildRequestInit({ method: "GET", headers: { n: 5 as never } })).code).toBe(
      "LUGAS_CLIENT_009",
    );
    const crlf = captureError(() =>
      buildRequestInit({ method: "GET", headers: { "x-t": "v\r\nX-Evil: 1" } }),
    );
    expect(crlf.code).toBe("LUGAS_CLIENT_009");
    expect(crlf.message).toContain("'x-t'");
    expect(captureError(() => buildRequestInit({ method: "GET", headers: ["x"] as never })).code).toBe(
      "LUGAS_CLIENT_009",
    );
  });

  test("undefined header entries are omitted silently by design", () => {
    const built = buildRequestInit({ method: "GET", headers: { "x-skip": undefined as never } });
    expect(new Headers(built.init.headers).has("x-skip")).toBeFalse();
  });
});

describe("buildRequestInit() JSON body policy", () => {
  test("declared bodies serialize with default JSON content type", () => {
    const built = buildRequestInit({ method: "POST", body: { a: 1 } });
    expect(built.init.body).toBe('{"a":1}');
    const h = new Headers(built.init.headers);
    expect(h.get("content-type")).toBe("application/json");
  });

  test("absent or null bodies send nothing synthetic", () => {
    for (const body of [undefined, null]) {
      const built = buildRequestInit({ method: "POST", body });
      expect(built.init.body).toBeUndefined();
      expect(new Headers(built.init.headers).has("content-type")).toBeFalse();
    }
  });

  test("caller JSON content types are preserved verbatim", () => {
    const built = buildRequestInit({
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: { ok: true },
    });
    expect(new Headers(built.init.headers).get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    const vendor = buildRequestInit({
      method: "POST",
      headers: { "content-type": "application/vnd.api+json" },
      body: [1],
    });
    expect(vendor.init.body).toBe("[1]");
  });

  test("non-JSON caller content types conflict instead of contradicting silently", () => {
    const err = captureError(() =>
      buildRequestInit({
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: { a: 1 },
      }),
    );
    expect(err.code).toBe("LUGAS_CLIENT_008");
    expect(err.message).toContain("text/plain");
  });

  test("non-representable bodies fail with LUGAS_CLIENT_008", () => {
    expect(captureError(() => buildRequestInit({ method: "POST", body: (() => 1) as never })).code).toBe(
      "LUGAS_CLIENT_008",
    );
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(captureError(() => buildRequestInit({ method: "POST", body: circular })).code).toBe(
      "LUGAS_CLIENT_008",
    );
  });
});
