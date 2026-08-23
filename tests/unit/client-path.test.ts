import { describe, expect, test } from "bun:test";
import { ClientPathError, interpolatePath } from "../../src/client/path";

describe("interpolatePath() parameter substitution", () => {
  test("replaces each declared parameter exactly once", () => {
    expect(interpolatePath("/users/:id/posts/:slug", { id: "usr_1", slug: "hello-world" })).toBe(
      "/users/usr_1/posts/hello-world",
    );
    expect(interpolatePath("/users/42", {})).toBe("/users/42");
    expect(interpolatePath("/ping")).toBe("/ping");
  });

  test("encodes reserved characters so values cannot add path segments", () => {
    expect(interpolatePath("/users/:id", { id: "a/b" })).toBe("/users/a%2Fb");
    expect(interpolatePath("/users/:id", { id: "x?next=/admin" })).toBe(
      "/users/x%3Fnext%3D%2Fadmin",
    );
    expect(interpolatePath("/users/:id", { id: "#frag" })).toBe("/users/%23frag");
    expect(interpolatePath("/:a/:b", { a: "..", b: "." })).toBe("/../.");
  });

  test("coerces number and boolean parameter values", () => {
    expect(interpolatePath("/items/:n/flag/:f", { n: 7, f: true })).toBe("/items/7/flag/true");
  });

  test("unicode values are percent-encoded segment-wise", () => {
    expect(interpolatePath("/u/:name", { name: "日本語" })).toBe(
      "/u/%E6%97%A5%E6%9C%AC%E8%AA%9E",
    );
  });

  test("wildcard accepts multi-segment strings and arrays", () => {
    expect(interpolatePath("/files/*", { "*": "a/b/c" })).toBe("/files/a/b/c");
    expect(interpolatePath("/files/*", { "*": ["a", "b c", "d"] })).toBe("/files/a/b%20c/d");
    expect(interpolatePath("/files/*", { "*": "" })).toBe("/files/");
    expect(interpolatePath("/a/:id/*", { id: "x", "*": "y/z" })).toBe("/a/x/y/z");
  });

  test("missing or undefined parameters throw LUGAS_CLIENT_001", () => {
    expect(() => interpolatePath("/users/:id", {})).toThrow(/^LUGAS_CLIENT_001/);
    expect(() => interpolatePath("/users/:id")).toThrow(/^LUGAS_CLIENT_001/);
    expect(() => interpolatePath("/users/:id", { id: undefined as never })).toThrow(
      /^LUGAS_CLIENT_001/,
    );
    expect(() => interpolatePath("/users/:id", { id: null as never })).toThrow(
      /^LUGAS_CLIENT_001/,
    );
    expect(() => interpolatePath("/files/*", {})).toThrow(/^LUGAS_CLIENT_001/);
    try {
      interpolatePath("/users/:id/posts/:slug", { slug: "s" });
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ClientPathError);
      expect((error as ClientPathError).code).toBe("LUGAS_CLIENT_001");
      expect((error as Error).message).toContain(":id");
    }
  });

  test("extra undeclared parameters throw LUGAS_CLIENT_002", () => {
    expect(() => interpolatePath("/ping", { extra: "1" })).toThrow(/^LUGAS_CLIENT_002/);
    expect(() => interpolatePath("/users/:id", { id: "1", extra: "2" })).toThrow(
      /^LUGAS_CLIENT_002/,
    );
    expect(() => interpolatePath("/ping", { "*": "x" })).toThrow(/^LUGAS_CLIENT_002/);
  });

  test("invalid parameter values and shapes throw LUGAS_CLIENT_003", () => {
    expect(() => interpolatePath("/users/:id", { id: { x: 1 } as never })).toThrow(
      /^LUGAS_CLIENT_003/,
    );
    expect(() => interpolatePath("/users/:id", { id: ["a"] as never })).toThrow(
      /^LUGAS_CLIENT_003/,
    );
    expect(() => interpolatePath("/users/:id", "str" as never)).toThrow(/^LUGAS_CLIENT_003/);
    expect(() => interpolatePath("/files/*", { "*": ["a", ""] })).toThrow(/^LUGAS_CLIENT_003/);
    expect(() => interpolatePath("/files/*", { "*": 5 as never })).toThrow(/^LUGAS_CLIENT_003/);
  });

  test("ambiguous duplicate declarations throw LUGAS_CLIENT_004", () => {
    expect(() => interpolatePath("/x/:a/:a", { a: "1" })).toThrow(/^LUGAS_CLIENT_004/);
  });

  test("invalid templates throw LUGAS_CLIENT_005", () => {
    expect(() => interpolatePath("users/:id", { id: "1" })).toThrow(/^LUGAS_CLIENT_005/);
    expect(() => interpolatePath("/x/:not-a-name", {})).toThrow(/^LUGAS_CLIENT_005/);
    expect(() => interpolatePath("/a/*/b", {})).toThrow(/^LUGAS_CLIENT_005/);
    expect(() => interpolatePath("/a/b*c", {})).toThrow(/^LUGAS_CLIENT_005/);
  });

  test("template parsing is memoized without behavior drift", () => {
    const first = interpolatePath("/memo/:id", { id: "1" });
    const second = interpolatePath("/memo/:id", { id: "2" });
    expect(first).toBe("/memo/1");
    expect(second).toBe("/memo/2");
  });
});
