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

  test("rejects ALL (Bun 1.4.0 method maps have no ALL key — M6R1-010)", () => {
    expect(() =>
      defineApp({ routes: { "/all": { ALL: () => new Response("ok") } } as never }),
    ).toThrow(/unsupported route entry/);
  });
});
