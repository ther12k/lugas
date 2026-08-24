/**
 * Manifest route-record capture tests (M4-002).
 *
 * Deterministic: pure composition fixtures, no servers, no network.
 */
import { describe, expect, test } from "bun:test";
import { captureRouteRecords, sortForSerialization } from "../../src/internal/manifest";
import type { ManifestRouteRecord } from "../../src/internal/manifest";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";

function fixtureApp() {
  return defineApp({
    routes: {
      "/health": new Response("ok"),
      "/assets": { dir: "./public" },
      "/legacy": (request: Request) => new Response("legacy"),
      "/users/:id": {
        GET: route({ handler: () => json(200, { ok: true }) }),
        DELETE: route({ handler: () => new Response(null, { status: 204 }) }),
      },
    },
    modules: [
      defineModule({
        name: "billing",
        routes: {
          "/invoices/:id": {
            GET: route({ handler: () => json(200, { ok: true }) }),
          },
        },
      }),
      defineModule({
        name: "audit",
        routes: {
          "/audit-log": {
            POST: route({ handler: () => json(201, { logged: true }) }),
          },
        },
      }),
    ],
  });
}

const app = fixtureApp();
const records = captureRouteRecords((app as unknown as { prepared: { facts: never } }).prepared.facts);

describe("manifest route capture", () => {
  test("every final method/path appears exactly once", () => {
    const keys = records.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual([
      "* /assets",
      "* /health",
      "* /legacy",
      "DELETE /users/:id",
      "GET /invoices/:id",
      "GET /users/:id",
      "POST /audit-log",
    ].sort());
  });

  test("module attribution is exact; root routes are null", () => {
    const byKey = new Map(records.map((r) => [`${r.method} ${r.path}`, r]));
    expect(byKey.get("GET /invoices/:id")?.module).toBe("billing");
    expect(byKey.get("DELETE /users/:id")?.module).toBeNull();
    expect(byKey.get("* /health")?.module).toBeNull();
    expect(byKey.get("POST /audit-log")?.module).toBe("audit");
  });

  test("native static/handler/directory and lugas descriptors classify truthfully", () => {
    const byKey = new Map(records.map((r) => [`${r.method} ${r.path}`, r]));
    const health = byKey.get("* /health")!;
    expect(health.kind).toBe("native");
    expect(health.native).toBe("static");

    const legacy = byKey.get("* /legacy")!;
    expect(legacy.kind).toBe("native");
    expect(legacy.native).toBe("handler");

    const assets = byKey.get("* /assets")!;
    expect(assets.kind).toBe("native");
    expect(assets.native).toBe("directory");

    for (const key of ["GET /users/:id", "DELETE /users/:id", "GET /invoices/:id"]) {
      const lugas = byKey.get(key)!;
      expect(lugas.kind).toBe("lugas");
      expect(lugas.native).toBeUndefined();
    }
  });

  test("records are frozen, readonly, and JSON-serializable without handler leakage", () => {
    for (const record of records) {
      expect(Object.isFrozen(record)).toBe(true);
    }
    expect(Object.isFrozen(records)).toBe(true);
    const text = JSON.stringify(records);
    // No function values survive serialization, and no handler/service keys.
    expect(text).not.toContain('":"function"');
    expect(text).not.toContain('"handler":');
    expect(text).not.toContain('"services":');
    const round = JSON.parse(text) as Array<ManifestRouteRecord>;
    expect(round).toEqual(records.map((r) => ({ ...r })));
  });

  test("serialization ordering follows the frozen v1 policy (path then method)", () => {
    const sorted = sortForSerialization(records);
    const keys = sorted.map((r) => `${r.method} ${r.path}`);
    expect(keys).toEqual([...keys].sort((a, b) => {
      const [am, ap] = [a.split(" ")[0]!, a.slice(a.indexOf(" ") + 1)];
      const [bm, bp] = [b.split(" ")[0]!, b.slice(b.indexOf(" ") + 1)];
      if (ap !== bp) return ap < bp ? -1 : 1;
      return am < bm ? -1 : am > bm ? 1 : 0;
    }));
    // "*" (code-unit 0x2A) precedes explicit verbs on the same path.
    const assetsIndex = keys.indexOf("* /assets");
    expect(assetsIndex).toBeGreaterThanOrEqual(0);
    expect(keys[assetsIndex - 1]?.endsWith("/assets") ?? false).toBe(false);
  });

  test("capture is deterministic across repeated runs", () => {
    const again = captureRouteRecords((app as unknown as { prepared: { facts: never } }).prepared.facts);
    expect(JSON.stringify(again)).toBe(JSON.stringify(records));
  });
});
