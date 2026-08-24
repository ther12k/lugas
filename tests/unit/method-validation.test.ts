/**
 * Method key validation probes (M5R1-003).
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";

describe("method key validation (M5R1-003)", () => {
  test("rejects FOO (not a valid HTTP method)", () => {
    expect(() =>
      defineApp({ routes: { "/x": { FOO: () => new Response("x") } } as never }),
    ).toThrow(/unsupported route entry/);
  });

  test("rejects lowercase get", () => {
    expect(() =>
      defineApp({ routes: { "/x": { get: () => new Response("x") } } as never }),
    ).toThrow(/unsupported route entry/);
  });

  test("accepts all valid uppercase methods", () => {
    const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
    for (const m of methods) {
      const key = `/m-${m}`;
      expect(() =>
        defineApp({ routes: { [key]: { [m]: () => new Response("ok") } } as never }),
      ).not.toThrow();
    }
  });

  test("accepts ALL for catch-all", () => {
    expect(() =>
      defineApp({ routes: { "/all": { ALL: () => new Response("ok") } } as never }),
    ).not.toThrow();
  });
});
