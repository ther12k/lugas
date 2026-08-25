/**
 * Path validation integration through defineApp() (M5R1-003 correction).
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";

describe("path validation via defineApp()", () => {
  test("rejects path without leading slash", () => {
    expect(() =>
      defineApp({ routes: { "users/:id": { GET: () => new Response("x") } } as never }),
    ).toThrow(/must start with/);
  });

  test("rejects empty param name", () => {
    expect(() =>
      defineApp({ routes: { "/users/:": { GET: () => new Response("x") } } as never }),
    ).toThrow(/invalid param token/);
  });

  test("rejects duplicate param name", () => {
    expect(() =>
      defineApp({ routes: { "/users/:id/:id": { GET: () => new Response("x") } } as never }),
    ).toThrow(/duplicate param/);
  });

  test("rejects non-final wildcard", () => {
    expect(() =>
      defineApp({ routes: { "/files/*/x": { GET: () => new Response("x") } } as never }),
    ).toThrow(/wildcard.*final segment/);
  });

  test("accepts valid final wildcard", () => {
    expect(() =>
      defineApp({ routes: { "/files/*": { GET: () => new Response("x") } } as never }),
    ).not.toThrow();
  });

  test("valid param route passes", () => {
    expect(() =>
      defineApp({ routes: { "/users/:id": { GET: () => new Response("ok") } } as never }),
    ).not.toThrow();
  });
});
