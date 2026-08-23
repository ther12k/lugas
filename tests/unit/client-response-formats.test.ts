import { describe, expect, test } from "bun:test";
import { parseResponse } from "../../src/client/parse-response";
import { ClientDecodeError } from "../../src/client/errors";

function responseWith(status: number, body: string | null, contentType?: string): Response {
  return new Response(
    body,
    contentType === undefined ? { status } : { status, headers: { "content-type": contentType } },
  );
}

describe("frozen wire-form semantics", () => {
  test("204 never attempts JSON parsing even with a JSON content type", async () => {
    const result = await parseResponse(responseWith(204, null, "application/json"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });

  test("205 and 304 are bodiless as well", async () => {
    for (const status of [205, 304]) {
      const result = await parseResponse(new Response(null, { status }));
      if (result.ok) {
        expect(result.data).toBeUndefined();
      }
    }
  });

  test("problem+json on non-2xx lands under error with parsed fields", async () => {
    const problem = {
      type: "https://lugasjs.dev/problems/validation",
      title: "Validation failed",
      status: 422,
    };
    const result = await parseResponse(
      responseWith(422, JSON.stringify(problem), "application/problem+json"),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.error).toEqual(problem);
    }
  });

  test("problem+json on 2xx lands under data", async () => {
    const result = await parseResponse(
      responseWith(200, '{"title":"odd-but-legal"}', "application/problem+json"),
    );
    if (result.ok) {
      expect(result.data).toEqual({ title: "odd-but-legal" });
    }
  });

  test("redirect statuses classify by real status without throwing", async () => {
    const redirect = new Response(null, { status: 302, headers: { location: "/elsewhere" } });
    const result = await parseResponse(redirect);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(302);
      expect(result.error).toBeUndefined();
    }
  });

  test("charset parameters do not disturb media detection or text decoding", async () => {
    const result = await parseResponse(
      responseWith(200, "héllo", "text/plain; charset=utf-8"),
    );
    if (result.ok) {
      expect(result.data).toBe("héllo");
    }
  });
});

describe("frozen decode-failure policy", () => {
  test("malformed JSON on a success throws ClientDecodeError with the original response", async () => {
    const original = responseWith(200, '{"broken":', "application/json");
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
    expect(decode.status).toBe(200);
    expect(decode.contentType).toBe("application/json");
    // clone policy: original body remains readable after the failure
    expect(await original.text()).toBe('{"broken":');
  });

  test("malformed JSON on a failure branch follows the same single policy", async () => {
    try {
      await parseResponse(responseWith(500, "not-json{", "application/json"));
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ClientDecodeError);
      expect((error as ClientDecodeError).status).toBe(500);
    }
  });

  test("empty-string bodies under a JSON content type are decode failures", async () => {
    await expect(parseResponse(responseWith(200, "", "application/json"))).rejects.toBeInstanceOf(
      ClientDecodeError,
    );
  });

  test("decode errors never embed body content in messages", async () => {
    const secretBody = '{"token":"super-secret-value"}';
    try {
      await parseResponse(responseWith(200, secretBody.slice(0, -1), "application/json"));
      throw new Error("expected throw");
    } catch (error) {
      expect((error as Error).message).not.toContain("super-secret");
    }
  });

  test("mismatched media type is authoritative: JSON bytes under text/plain stay text", async () => {
    const result = await parseResponse(responseWith(200, '{"a":1}', "text/plain"));
    if (result.ok) {
      expect(result.data).toBe('{"a":1}');
    }
  });
});
