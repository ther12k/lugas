/**
 * M3-015 adversarial matrix — request building (headers, bodies, init) and
 * response parsing (media types × statuses × decode failures).
 */
import { describe, expect, test } from "bun:test";
import { recordingClient } from "./fixtures";
import { parseResponse } from "../../src/client/parse-response";
import { ClientDecodeError } from "../../src/client/errors";

describe("matrix: headers, body, platform options", () => {
  test("typed headers and JSON body reach the wire exactly once each", async () => {
    const { client, captured } = recordingClient();
    await client.post("/m/:id", {
      params: { id: "9" },
      headers: { authorization: "Bearer tok" },
      body: { name: "Ada" },
    });
    expect(captured[0]?.headerEntries).toEqual([
      ["authorization", "Bearer tok"],
      ["content-type", "application/json"],
    ]);
    expect(captured[0]?.bodyText).toBe(JSON.stringify({ name: "Ada" }));
  });

  test("caller content types survive; non-JSON ones conflict before dispatch", async () => {
    const ok = recordingClient();
    await ok.client.post("/m/:id", {
      params: { id: "1" },
      headers: { "content-type": "application/vnd.x+json", authorization: "t" },
      body: {},
    });
    expect(ok.captured[0]?.headerEntries).toContainEqual([
      "content-type",
      "application/vnd.x+json",
    ]);

    const bad = recordingClient();
    expect(() =>
      bad.client.post("/m/:id", {
        params: { id: "1" },
        headers: { "content-type": "text/plain" },
        body: {},
      } as never),
    ).toThrow(/^LUGAS_CLIENT_008/);
    expect(bad.captured).toHaveLength(0);
  });

  test("init ownership violations and header injection fail closed", () => {
    const c1 = recordingClient();
    expect(() => c1.client.get("/plain", { init: { method: "POST" } } as never)).toThrow(
      /^LUGAS_CLIENT_007/,
    );
    const c2 = recordingClient();
    expect(() =>
      c2.client.get("/plain", { headers: { "x-e": "a\r\nb" } } as never),
    ).toThrow(/^LUGAS_CLIENT_009/);
    for (const c of [c1, c2]) {
      expect(c.captured).toHaveLength(0);
    }
  });

  test("abort signal reaches the transport unchanged (identity)", async () => {
    const controller = new AbortController();
    const { client, captured } = recordingClient();
    await client.get("/plain", { init: { signal: controller.signal } });
    expect(captured[0]?.signal).toBe(controller.signal);
  });
});

function res(status: number, body: string | null, contentType?: string): Response {
  return new Response(
    body,
    contentType === undefined ? { status } : { status, headers: { "content-type": contentType } },
  );
}

describe("matrix: media type × status branch", () => {
  const rows = [
    { name: "json success → data", status: 200, body: '{"a":1}', ct: "application/json", ok: true, slotValue: { a: 1 } },
    {
      name: "problem+json failure → error",
      status: 422,
      body: '{"title":"v"}',
      ct: "application/problem+json",
      ok: false,
      slotValue: { title: "v" },
    },
    { name: "text success → string", status: 202, body: "hi", ct: "text/plain", ok: true, slotValue: "hi" },
    {
      name: "unknown media stays undefined and unconsumed",
      status: 200,
      body: "\x01",
      ct: "application/octet-stream",
      ok: true,
      slotValue: undefined,
    },
    { name: "missing content-type → undefined", status: 200, body: "?", ct: undefined, ok: true, slotValue: undefined },
    {
      name: "unknown status 599 with json is an explicit failure",
      status: 599,
      body: '{"weird":true}',
      ct: "application/json",
      ok: false,
      slotValue: { weird: true },
    },
    { name: "3xx classification follows Response.ok", status: 302, body: null, ct: undefined, ok: false, slotValue: undefined },
  ] as const;

  for (const row of rows) {
    test(row.name, async () => {
      const { status, body, ct, ok, slotValue } = row;
      const original = res(status, body as string | null, ct as string | undefined);
    const result = await parseResponse(original);
    expect(result.ok).toBe(ok);
    expect(result.status).toBe(status);
    const slot = result.ok ? result.data : result.error;
    expect(slot).toEqual(slotValue);
      if (ct === "application/octet-stream") {
        // unknown media must not consume the original stream
        expect(await original.arrayBuffer()).toBeTruthy();
      }
    });
  }

  test("204 with a lying content type never parses", async () => {
    const result = await parseResponse(res(204, null, "application/json"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });
});

describe("matrix: malformed declared responses", () => {
  test("malformed JSON throws the single frozen ClientDecodeError policy", async () => {
    for (const status of [200, 502]) {
      const original = res(status, "{oops", "application/json");
      let caught: unknown;
      try {
        await parseResponse(original);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ClientDecodeError);
      const decode = caught as ClientDecodeError;
      expect(decode.code).toBe("LUGAS_CLIENT_010");
      expect(decode.response).toBe(original);
      expect(await original.text()).toBe("{oops");
    }
  });

  test("decode errors keep payload content out of messages", async () => {
    try {
      await parseResponse(res(200, '{"secret":"zzz-value"}', "application/json"));
      throw new Error("expected throw");
    } catch (error) {
      expect((error as Error).message).not.toContain("zzz-value");
    }
  });
});
