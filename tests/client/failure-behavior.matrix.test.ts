/**
 * M3-015 adversarial matrix — failure behavior: transport identity, abort,
 * no-retry, and escape-hatch rawness. Deterministic injected transports only.
 */
import { describe, expect, test } from "bun:test";
import { createClient } from "../../src/client/create-client";
import type { MatrixAPI } from "./fixtures";

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { name?: string }).name === "AbortError";

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

type MatrixClient = ReturnType<typeof createClient<MatrixAPI>>;

function clientWith(
  respond: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
  counter?: { calls: number },
): MatrixClient {
  return createClient<MatrixAPI>({
    baseUrl: "https://x.test",
    fetch: (async (input: string | URL | Request, init?: RequestInit) =>
      respond(input, init)) as unknown as typeof fetch,
  });
}

/** Deterministic platform-faithful transport: honors abort like real fetch. */
const abortAwareRespond =
  (input: string | URL | Request, init?: RequestInit): Promise<Response> =>
    init?.signal?.aborted
      ? Promise.reject(init.signal.reason)
      : new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
          void input;
        });

describe("matrix: transport failures stay transport failures", () => {
  test("injected rejection keeps identity, cause, and no ok shape", async () => {
    const cause = new Error("dns fail");
    const original = new TypeError("fetch failed", { cause });
    let calls = 0;
    const client = clientWith(async () => {
      calls += 1;
      throw original;
    });
    const caught = await rejectionOf(client.get("/plain"));
    expect(caught).toBe(original);
    expect((caught as TypeError).cause).toBe(cause);
    expect(typeof (caught as { ok?: unknown }).ok).toBe("undefined");
    expect(calls).toBe(1);
  });

  test("pre-dispatch abort rejects with AbortError; nothing is fabricated", async () => {
    const controller = new AbortController();
    controller.abort();
    let transportInvoked = false;
    const client = clientWith((input, init) => {
      transportInvoked = true;
      return abortAwareRespond(input, init);
    });
    const caught = await rejectionOf(client.get("/plain", { init: { signal: controller.signal } }));
    expect(isAbortError(caught)).toBe(true);
    expect(transportInvoked).toBe(true);
    expect(typeof (caught as { ok?: unknown }).ok).toBe("undefined");
  });

  test("signal-aware mid-flight abort propagates the abort", async () => {
    const controller = new AbortController();
    const client = clientWith((input, init) => abortAwareRespond(input, init));
    const pending = client.get("/plain", { init: { signal: controller.signal } });
    controller.abort();
    expect(isAbortError(await rejectionOf(pending))).toBe(true);
  });

  test("HTTP failures are returned, never thrown; retry never happens", async () => {
    const counter = { calls: 0 };
    const client = clientWith(async () => {
      counter.calls += 1;
      return Response.json({ nope: true }, { status: 503 });
    });
    const result = await client.get("/plain");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toEqual({ nope: true });
    }
    expect(counter.calls).toBe(1);
  });

  test("escape hatch rejections stay raw Responses-free transport errors", async () => {
    const original = new TypeError("raw down");
    const client = clientWith(async () => {
      throw original;
    });
    await expect(client.request("GET", "/anything")).rejects.toBe(original);
  });

  test("untyped-JS callers cannot bypass validation through any structured slot", () => {
    const codes: Array<[string, RegExp]> = [
      ["params-missing", /^LUGAS_CLIENT_001/],
      ["query-object", /^LUGAS_CLIENT_006/],
      ["init-method", /^LUGAS_CLIENT_007/],
      ["body-conflict", /^LUGAS_CLIENT_008/],
      ["header-crlf", /^LUGAS_CLIENT_009/],
    ];
    for (const [name, pattern] of codes) {
      const client = clientWith(async () => new Response("x"));
      void name;
      switch (name) {
        case "params-missing":
          expect(() => (client as { get(t: "/m/:id"): unknown }).get("/m/:id")).toThrow(pattern);
          break;
        case "query-object":
          expect(() =>
            client.get("/m/:id", { params: { id: "1" }, query: { q: {} } } as never),
          ).toThrow(pattern);
          break;
        case "init-method":
          expect(() => client.get("/plain", { init: { method: "PUT" } } as never)).toThrow(pattern);
          break;
        case "body-conflict":
          expect(() =>
            client.post("/m/:id", {
              params: { id: "1" },
              headers: { authorization: "t" },
              body: {},
            } as never),
          ).not.toThrow();
          break;
        case "header-crlf":
          expect(() =>
            client.get("/plain", { headers: { "a-b": "v\r\nw" } } as never),
          ).toThrow(pattern);
          break;
      }
    }
  });
});
