import { describe, expect, test } from "bun:test";
import { compose } from "../../src/internal/compose";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { duplicateRoute } from "../../src/internal/diagnostics";

const handler = route({ handler: () => new Response("ok") });

describe("route collision rejection", () => {
  test("same path from two modules is rejected with both owners", () => {
    const a = defineModule({ name: "a", routes: { "/x": { GET: handler } } });
    const b = defineModule({ name: "b", routes: { "/x": { GET: handler } } });
    expect(() => compose({ modules: [a, b] as never })).toThrow(
      duplicateRoute("GET", "/x", "module 'a'", "module 'b'").message,
    );
  });

  test("module path colliding with app root is rejected", () => {
    const a = defineModule({ name: "a", routes: { "/health": { GET: handler } } });
    expect(() => compose({ routes: { "/health": { GET: handler } }, modules: [a] as never })).toThrow(
      /app root routes.*module 'a'|module 'a'.*app root routes/,
    );
  });

  test("descriptor entry and native static entry on the same path collide", () => {
    const a = defineModule({ name: "a", routes: { "/d": handler } });
    expect(() => compose({ routes: { "/d": new Response("x") }, modules: [a] as never })).toThrow(/\/d/);
  });

  test("different methods on the same path do not collide", () => {
    const a = defineModule({ name: "a", routes: { "/m": { GET: handler } } });
    const b = defineModule({ name: "b", routes: { "/m": { POST: handler } } });
    expect(() => compose({ modules: [a, b] as never })).not.toThrow();
  });

  test("declaration order never silently selects a winner", () => {
    const first = defineModule({ name: "first", routes: { "/o": { GET: handler } } });
    const second = defineModule({ name: "second", routes: { "/o": { GET: handler } } });
    expect(() => compose({ modules: [first, second] as never })).toThrow(/first.*second/);
    expect(() => compose({ modules: [second, first] as never })).toThrow(/second.*first/);
  });

  test("directory and wildcard-style entries claim their path once", () => {
    const assets = defineModule({ name: "assets", routes: { "/assets/*": { dir: "./public" } } });
    expect(() => compose({ modules: [assets] as never })).not.toThrow();
  });
});
