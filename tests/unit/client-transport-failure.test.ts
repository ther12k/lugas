import { describe, expect, test } from "bun:test";
import { createClient } from "../../src/client/create-client";

type MinimalAPI = {
  readonly "/thing": {
    readonly GET: {
      readonly responses:
        | import("../../src/core/response").TypedResponse<200, { value: number }>
        | import("../../src/core/response").TypedResponse<500, { boom: boolean }>;
    };
  };
};

function failingClient(rejectWith: unknown, counter?: { calls: number }) {
  return createClient<MinimalAPI>({
    baseUrl: "https://x.test",
    fetch: (async (_input: string | URL | Request, _init?: RequestInit) => {
      if (counter) {
        counter.calls += 1;
      }
      throw rejectWith;
    }) as unknown as typeof fetch,
  });
}

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

describe("transport failures are preserved, never converted", () => {
  test("injected network errors keep their identity and cause chain", async () => {
    const cause = new Error("socket hangup");
    const original = new TypeError("fetch failed", { cause });
    const client = failingClient(original);
    let caught: unknown;
    try {
      await client.get("/thing");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(original);
    expect((caught as TypeError).message).toBe("fetch failed");
    expect((caught as TypeError).cause).toBe(cause);
  });

  test("rejections are not fabricated into ok-shaped client results", async () => {
    const client = failingClient(new Error("ECONNREFUSED"));
    try {
      await client.get("/thing");
      throw new Error("expected rejection");
    } catch (error) {
      expect((error as Error).message).toBe("ECONNREFUSED");
      expect(typeof (error as { ok?: unknown }).ok).toBe("undefined");
    }
  });

  test("abort before dispatch rejects with the platform AbortError", async () => {
    const controller = new AbortController();
    const client = createClient<MinimalAPI>({
      baseUrl: "https://x.test",
      fetch: globalThis.fetch,
    });
    controller.abort();
    expect(isAbortError(await rejectionOf(client.get("/thing", { init: { signal: controller.signal } })))).toBe(
      true,
    );
  });

  test("abort mid-flight through a signal-aware injected transport propagates", async () => {
    const controller = new AbortController();
    const client = createClient<MinimalAPI>({
      baseUrl: "https://x.test",
      fetch: (async (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
        })) as unknown as typeof fetch,
    });
    const pending = client.get("/thing", { init: { signal: controller.signal } });
    controller.abort();
    expect(isAbortError(await rejectionOf(pending))).toBe(true);
  });

  test("real-server abort surfaces the platform abort rejection", async () => {
    const appServer = Bun.serve({
      port: 0,
      fetch: async () => {
        await Bun.sleep(250);
        return new Response("late");
      },
    });
    const client = createClient<{
      readonly "/late": {
        readonly GET: {
          readonly responses: import("../../src/core/response").TypedResponse<200, string>;
        };
      };
    }>({
      baseUrl: appServer.url,
      fetch: globalThis.fetch,
    });
    const controller = new AbortController();
    const pending = client.get("/late", { init: { signal: controller.signal } });
    setTimeout(() => controller.abort(), 20);
    expect(isAbortError(await rejectionOf(pending))).toBe(true);
    appServer.stop(true);
  });

  test("HTTP 500 remains a returned failure, not a thrown transport error", async () => {
    let calls = 0;
    const client = createClient<MinimalAPI>({
      baseUrl: "https://x.test",
      fetch: (async () => {
        calls += 1;
        return new Response(JSON.stringify({ boom: true }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }) as unknown as typeof fetch,
    });
    const result = await client.get("/thing");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toEqual({ boom: true });
    }
    expect(calls).toBe(1);
  });

  test("no automatic retry occurs for transport failures or HTTP failures", async () => {
    const counter = { calls: 0 };
    const throwing = failingClient(new TypeError("down"), counter);
    await throwing.get("/thing").catch(() => undefined);
    expect(counter.calls).toBe(1);
  });

  test("the escape hatch rejects raw as well", async () => {
    const original = new TypeError("raw down");
    const client = failingClient(original);
    await expect(client.request("GET", "/thing")).rejects.toBe(original);
  });
});
