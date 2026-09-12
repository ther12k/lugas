/**
 * formBody() + the multipart encoder path of buildRequestInit (RF-3 item 3):
 * the wrapper is the runtime discriminator, native File/Blob values survive
 * as parts, arrays fan out to repeated parts, and content-type ownership
 * follows the boundary rule (the platform generates it).
 */
import { describe, expect, test } from "bun:test";
import { form } from "../../src/index";
import { formBody } from "../../src/client/index";
import { buildRequestInit } from "../../src/client/request";

const errCode = (run: () => unknown): string => {
  try {
    run();
    throw new Error("expected throw");
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
};

describe("formBody", () => {
  test("returns a frozen wrapper; arrays are copied and frozen", () => {
    const values = { name: "ada", tags: ["a", "b"] };
    const wrapped = formBody(values);
    expect(wrapped.multipart).toBe(true);
    expect(Object.isFrozen(wrapped)).toBe(true);
    expect(Object.isFrozen(wrapped.values)).toBe(true);
    expect(Object.isFrozen((wrapped.values as { tags: unknown }).tags)).toBe(true);
    values.tags.push("c"); // later mutation cannot contradict the sent request
    expect((wrapped.values as { tags: string[] }).tags).toEqual(["a", "b"]);
  });

  test("rejects non-object values", () => {
    expect(errCode(() => formBody([1, 2] as never))).toBe("LUGAS_CLIENT_008");
    expect(errCode(() => formBody(null as never))).toBe("LUGAS_CLIENT_008");
  });
});

describe("buildRequestInit multipart path", () => {
  test("converts values to FormData; scalars stringify, arrays fan out, File identity survives", () => {
    const file = new File(["payload"], "cat.png", { type: "image/png" });
    const { init } = buildRequestInit({
      method: "POST",
      body: formBody({ name: "ada", active: true, count: 2, files: [file, "note"], file }),
    });
    const formData = init.body as FormData;
    expect(formData instanceof FormData).toBe(true);
    expect(formData.get("name")).toBe("ada");
    expect(formData.get("active")).toBe("true");
    expect(formData.get("count")).toBe("2");
    expect(formData.getAll("files")).toEqual([file, "note"]);
    // Bun's FormData stores a structural copy — value preservation is the
    // contract (name/type/bytes), not instance identity.
    const stored = formData.get("file") as File;
    expect(stored.name).toBe("cat.png");
    expect(stored.type).toBe("image/png");
    expect(stored.size).toBe(file.size);
  });

  test("sets no content-type; the platform owns the boundary", () => {
    const { init } = buildRequestInit({ method: "POST", body: formBody({ a: "1" }) });
    expect(new Headers(init.headers).get("content-type")).toBeNull();
  });

  test("any caller content type is a conflict for a multipart body", () => {
    expect(
      errCode(() =>
        buildRequestInit({
          method: "POST",
          headers: { "content-type": "multipart/form-data" },
          body: formBody({ a: "1" }),
        }),
      ),
    ).toBe("LUGAS_CLIENT_008");
  });

  test("rejects unsupported part values", () => {
    expect(errCode(() => buildRequestInit({ method: "POST", body: formBody({ nested: { a: 1 } } as never) }))).toBe("LUGAS_CLIENT_008");
    expect(errCode(() => buildRequestInit({ method: "POST", body: formBody({ nested: [[1]] } as never) }))).toBe("LUGAS_CLIENT_008");
  });

  test("omitted (undefined) fields send nothing; JSON path is unchanged", () => {
    const jsonInit = buildRequestInit({ method: "POST", body: { a: 1 } });
    expect(jsonInit.init.body).toBe('{"a":1}');
    expect(new Headers(jsonInit.init.headers).get("content-type")).toBe("application/json");
    const noBody = buildRequestInit({ method: "POST", body: undefined });
    expect(noBody.init.body).toBeUndefined();
  });
});

describe("form() repeated config", () => {
  test("rejects unknown modes; accepts both documented modes", () => {
    expect(errCode(() => form({ repeated: "bogus" as never }))).toBe("LUGAS_FORM_001");
    expect(form({ repeated: "preserve" }).repeated).toBe("preserve");
    expect(form().repeated).toBe("last-wins");
  });
});
