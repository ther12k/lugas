import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";

const handler = route({ handler: () => new Response("ok") });

describe("defineApp()", () => {
  test("composes root routes and module routes with ownership", () => {
    const users = defineModule({ name: "users", routes: { "/users/:id": { GET: handler } } });
    const app = defineApp({ routes: { "/health": new Response("OK") }, modules: [users] });
    expect(app.manifest.modules).toEqual(["users"]);
    expect(app.manifest.routeCount).toBe(2);
  });

  test("rejects duplicate module names", () => {
    const a = defineModule({ name: "dupe", routes: { "/a": { GET: handler } } });
    const b = defineModule({ name: "dupe", routes: { "/b": { GET: handler } } });
    expect(() => defineApp({ modules: [a, b] })).toThrow(/duplicate module name/);
  });

  test("rejects unknown config keys and non-module entries", () => {
    expect(() => defineApp({ servisec: {} } as never)).toThrow(/servisec/);
    expect(() => defineApp({ modules: [{}] as never })).toThrow(/modules/);
  });

  test("placeholder manifest reports only runtime truth", () => {
    const app = defineApp({ services: { db: 1 } });
    expect(app.manifest.routeCount).toBe(0);
    expect(Object.isFrozen(app.manifest)).toBe(true);
  });

  test("app is frozen and carries services", () => {
    const app = defineApp({ services: { db: "pg" } });
    expect(Object.isFrozen(app)).toBe(true);
    expect(app.services).toEqual({ db: "pg" });
  });
});
