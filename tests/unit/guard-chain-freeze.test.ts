/**
 * Guard-chain immutability tests (M6R1-004).
 *
 * `route()` must snapshot and freeze the caller's `before` array: mutation
 * of the caller's reference after app preparation can never empty the
 * runtime guard chain or desync it from the compiled/manifest view.
 */
import { describe, expect, test } from "bun:test";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { defineApp } from "../../src/core/app";
import { json } from "../../src/core/response";
import { serializeManifest } from "../../src/internal/manifest";

function makeAuthGuard(executed: string[]) {
  return guard({
    name: "authGuard",
    handler: (ctx) => {
      executed.push("auth");
      if (!ctx.request.headers.get("authorization")) {
        return json(401, { error: "unauthorized" });
      }
      return { user: "authenticated" };
    },
  });
}

describe("guard chain freeze (M6R1-004)", () => {
  test("route() snapshots and freezes the caller's before array", () => {
    const chain = [makeAuthGuard([])];
    const descriptor = route({ before: chain, handler: () => json(200, { ok: true }) });

    expect(Object.isFrozen((descriptor as { before: readonly unknown[] }).before)).toBe(true);

    chain.length = 0;
    expect((descriptor as { before: readonly unknown[] }).before.length).toBe(1);
  });

  test("clearing the caller's array after defineApp cannot bypass the guard at runtime", async () => {
    const executed: string[] = [];
    const chain = [makeAuthGuard(executed)];

    const app = defineApp({
      routes: {
        "/admin": {
          GET: route({ before: chain, handler: () => json(200, { secret: true }) }),
        },
      },
    });

    chain.length = 0;

    // Runtime via the public serve path: the guard must still short-circuit.
    const server = app.serve({ port: 0 });
    try {
      const res = await fetch(`http://localhost:${server.port}/admin`);
      expect(res.status).toBe(401);
    } finally {
      server.stop(true);
    }
    expect(executed).toEqual(["auth"]);
  });

  test("manifest still lists the guard after caller mutation (no desync)", () => {
    const chain = [makeAuthGuard([])];
    const app = defineApp({
      routes: {
        "/admin": {
          GET: route({ before: chain, handler: () => json(200, { secret: true }) }),
        },
      },
    });

    chain.length = 0;

    const serialized = serializeManifest(app.manifest);
    expect(serialized).toContain("authGuard");
  });
});
