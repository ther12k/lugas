import { describe, expect, test } from "bun:test";
import { decodeQuery } from "../../src/internal/decode-query";

describe("Query object security & prototype protection", () => {
  test("returns null-prototype object that does not inherit Object.prototype", () => {
    const query = decodeQuery("?a=1");
    expect(Object.getPrototypeOf(query)).toBeNull();
  });

  test("protects against prototype pollution via __proto__ parameter", () => {
    const query = decodeQuery("?__proto__=polluted&__proto__=second");
    expect(query["__proto__"]).toEqual(["polluted", "second"]);

    // Verify global Object.prototype was NOT polluted
    const cleanObject = {};
    expect((cleanObject as { polluted?: unknown }).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty("polluted")).toBe(false);
  });

  test("protects against constructor and prototype parameter override", () => {
    const query = decodeQuery("?constructor=hacked&prototype=overridden");
    expect(query["constructor"]).toBe("hacked");
    expect(query["prototype"]).toBe("overridden");

    const cleanObject = {};
    expect(cleanObject.constructor).toBe(Object);
  });

  test("does not expose prototype helper functions as properties", () => {
    const query = decodeQuery("?key=value");
    expect((query as { toString?: unknown }).toString).toBeUndefined();
    expect((query as { valueOf?: unknown }).valueOf).toBeUndefined();
    expect((query as { hasOwnProperty?: unknown }).hasOwnProperty).toBeUndefined();
  });
});
