import { describe, expect, test } from "bun:test";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";

describe("defineModule()", () => {
  test("creates a named frozen container preserving route values", () => {
    const handler = route({ handler: () => new Response("ok") });
    const mod = defineModule({ name: "users", routes: { "/users/:id": { GET: handler } } });
    expect(mod.name).toBe("users");
    expect(Object.isFrozen(mod)).toBe(true);
    expect((mod.routes["/users/:id"] as Record<string, unknown>)["GET"]).toBe(handler);
  });

  test("preserves native Bun-style values untouched", () => {
    const staticResponse = new Response("static");
    const mod = defineModule({ name: "root", routes: { "/health": staticResponse } });
    expect(mod.routes["/health"]).toBe(staticResponse);
  });

  test("rejects empty names and unknown keys", () => {
    expect(() => defineModule({ name: "", routes: {} })).toThrow(/name/);
    expect(() => defineModule({ name: "x", routes: {}, nmae: "y" } as never)).toThrow(/nmae/);
  });

  test("rejects non-object route maps", () => {
    expect(() => defineModule({ name: "x", routes: [] as never })).toThrow(/routes/);
  });

  test("module-local lowercase duplicate method keys are rejected", () => {
    const handler = route({ handler: () => new Response() });
    expect(() =>
      defineModule({
        name: "dupe",
        routes: { "/a": { get: handler, GET: handler } as never },
      }),
    ).toThrow(/duplicate/);
  });
});
