import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";

const PUB = join(import.meta.dir, "fixtures", "public");

/**
 * M7-001 — startup validation of the assets configuration (ADR-0018).
 * Ownership is fail-closed: overlaps are rejected with stable diagnostics,
 * never resolved by spread order or Bun match specificity.
 */
describe("M7-001 configuration validation", () => {
  test("accepts a well-formed configuration", () => {
    expect(() =>
      defineApp({
        routes: { "/api/ping": { GET: route({ handler: () => json(200, { pong: true }) }) } },
        assets: {
          files: { "/index.html": join(PUB, "index.html") },
          dirs: { "/assets/*": join(PUB, "assets") },
        },
      }),
    ).not.toThrow();
  });

  test("rejects unknown assets keys and non-object shapes", () => {
    expect(() => defineApp({ assets: { public: "./public" } as never })).toThrow(/LUGAS_ASSET_001|unknown assets key/);
    expect(() => defineApp({ assets: "public" as never })).toThrow(/LUGAS_ASSET_001/);
    expect(() => defineApp({ assets: { files: "./public" as never } })).toThrow(/LUGAS_ASSET_001/);
  });

  test("rejects param/wildcard file-mapping keys and root catch-all mounts", () => {
    expect(() =>
      defineApp({ assets: { files: { "/u/:id": join(PUB, "index.html") } } }),
    ).toThrow(/LUGAS_ASSET_001/);
    expect(() =>
      defineApp({ assets: { files: { "/legacy/*": join(PUB, "index.html") } } }),
    ).toThrow(/LUGAS_ASSET_001/);
    expect(() => defineApp({ assets: { dirs: { "/*": join(PUB, "assets") } } })).toThrow(/LUGAS_ASSET_001/);
    expect(() => defineApp({ assets: { dirs: { "/assets": join(PUB, "assets") } } })).toThrow(/LUGAS_ASSET_001/);
    expect(() => defineApp({ assets: { dirs: { "/a/*/b": join(PUB, "assets") } } })).toThrow(/LUGAS_ASSET_001/);
  });

  test("rejects declarations that do not point at existing content", () => {
    expect(() =>
      defineApp({ assets: { files: { "/missing.txt": join(PUB, "no-such-file.txt") } } }),
    ).toThrow(/LUGAS_ASSET_003/);
    expect(() =>
      defineApp({ assets: { dirs: { "/assets/*": join(PUB, "no-such-dir") } } }),
    ).toThrow(/LUGAS_ASSET_003/);
  });

  test("rejects ambiguous ownership: asset vs API route, both mapping forms and directions", () => {
    const file = join(PUB, "index.html");
    // File mapping overlaps an API route.
    expect(() =>
      defineApp({
        routes: { "/index.html": { GET: route({ handler: () => json(200, {}) }) } },
        assets: { files: { "/index.html": file } },
      }),
    ).toThrow(/LUGAS_ASSET_002/);
    // API route inside a mounted prefix.
    expect(() =>
      defineApp({
        routes: { "/assets/status": { GET: route({ handler: () => json(200, {}) }) } },
        assets: { dirs: { "/assets/*": join(PUB, "assets") } },
      }),
    ).toThrow(/LUGAS_ASSET_002/);
    // Mount inside an API-owned param namespace.
    expect(() =>
      defineApp({
        routes: { "/assets/:id": { GET: route({ handler: () => json(200, {}) }) } },
        assets: { dirs: { "/assets/*": join(PUB, "assets") } },
      }),
    ).toThrow(/LUGAS_ASSET_002/);
    // Two mounts overlap.
    expect(() =>
      defineApp({
        assets: {
          dirs: { "/assets/*": join(PUB, "assets"), "/assets/static/*": join(PUB, "assets") },
        },
      }),
    ).toThrow(/LUGAS_ASSET_002/);
    // File mapping inside a mount.
    expect(() =>
      defineApp({
        assets: {
          files: { "/assets/app.js": join(PUB, "assets", "app.js") },
          dirs: { "/assets/*": join(PUB, "assets") },
        },
      }),
    ).toThrow(/LUGAS_ASSET_002/);
  });

  test("disjoint same-prefix siblings are accepted", () => {
    expect(() =>
      defineApp({
        routes: { "/api/status": { GET: route({ handler: () => json(200, {}) }) } },
        assets: { dirs: { "/assets/*": join(PUB, "assets") } },
      }),
    ).not.toThrow();
  });
});
