import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";

const PUB = join(import.meta.dir, "fixtures", "public");

function errCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    const e = error as { name?: string; code?: string };
    return e.code;
  }
  return undefined;
}

/**
 * M7-001 — startup validation of the assets configuration (ADR-0018).
 * Ownership is fail-closed: overlaps are rejected with stable diagnostics,
 * never resolved by spread order or Bun match specificity.
 * Native directory mounts are restricted to Linux (openat2 symlink containment);
 * non-Linux platforms fail closed at startup with LUGAS_ASSET_004.
 */
describe("M7-001 configuration validation", () => {
  test.skipIf(process.platform !== "linux")(
    "accepts a well-formed configuration with directory mounts (Linux)",
    () => {
      expect(() =>
        defineApp({
          routes: { "/api/ping": { GET: route({ handler: () => json(200, { pong: true }) }) } },
          assets: {
            files: { "/index.html": join(PUB, "index.html") },
            dirs: { "/assets/*": join(PUB, "assets") },
          },
        }),
      ).not.toThrow();
    },
  );

  test("accepts a well-formed file-only configuration on all platforms", () => {
    expect(() =>
      defineApp({
        routes: { "/api/ping": { GET: route({ handler: () => json(200, { pong: true }) }) } },
        assets: {
          files: { "/index.html": join(PUB, "index.html") },
        },
      }),
    ).not.toThrow();
  });

  test("accepts an empty directory map (dirs: {}) on all platforms", () => {
    expect(() =>
      defineApp({
        routes: { "/api/ping": { GET: route({ handler: () => json(200, { pong: true }) }) } },
        assets: {
          files: { "/index.html": join(PUB, "index.html") },
          dirs: {},
        },
      }),
    ).not.toThrow();
  });

  test("rejects unknown assets keys and non-object shapes", () => {
    expect(errCode(() => defineApp({ assets: { public: "./public" } as never }))).toBe("LUGAS_ASSET_001");
    expect(errCode(() => defineApp({ assets: "public" as never }))).toBe("LUGAS_ASSET_001");
    expect(errCode(() => defineApp({ assets: { files: "./public" as never } }))).toBe("LUGAS_ASSET_001");
  });

  test("rejects param/wildcard file-mapping keys and root catch-all mounts", () => {
    expect(errCode(() => defineApp({ assets: { files: { "/u/:id": join(PUB, "index.html") } } }))).toBe(
      "LUGAS_ASSET_001",
    );
    expect(errCode(() => defineApp({ assets: { files: { "/legacy/*": join(PUB, "index.html") } } }))).toBe(
      "LUGAS_ASSET_001",
    );
    expect(errCode(() => defineApp({ assets: { dirs: { "/*": join(PUB, "assets") } } }))).toBe(
      "LUGAS_ASSET_001",
    );
    expect(errCode(() => defineApp({ assets: { dirs: { "/assets": join(PUB, "assets") } } }))).toBe(
      "LUGAS_ASSET_001",
    );
    expect(errCode(() => defineApp({ assets: { dirs: { "/a/*/b": join(PUB, "assets") } } }))).toBe(
      "LUGAS_ASSET_001",
    );
  });

  test("rejects declarations that do not point at existing content", () => {
    expect(
      errCode(() => defineApp({ assets: { files: { "/missing.txt": join(PUB, "no-such-file.txt") } } })),
    ).toBe("LUGAS_ASSET_003");
    expect(
      errCode(() => defineApp({ assets: { dirs: { "/assets/*": join(PUB, "no-such-dir") } } })),
    ).toBe("LUGAS_ASSET_003");
  });

  test.skipIf(process.platform !== "linux")(
    "rejects ambiguous ownership: asset vs API route, both mapping forms and directions (Linux)",
    () => {
      const file = join(PUB, "index.html");
      // File mapping overlaps an API route.
      expect(
        errCode(() =>
          defineApp({
            routes: { "/index.html": { GET: route({ handler: () => json(200, {}) }) } },
            assets: { files: { "/index.html": file } },
          }),
        ),
      ).toBe("LUGAS_ASSET_002");
      // API route inside a mounted prefix.
      expect(
        errCode(() =>
          defineApp({
            routes: { "/assets/status": { GET: route({ handler: () => json(200, {}) }) } },
            assets: { dirs: { "/assets/*": join(PUB, "assets") } },
          }),
        ),
      ).toBe("LUGAS_ASSET_002");
      // Mount inside an API-owned param namespace.
      expect(
        errCode(() =>
          defineApp({
            routes: { "/assets/:id": { GET: route({ handler: () => json(200, {}) }) } },
            assets: { dirs: { "/assets/*": join(PUB, "assets") } },
          }),
        ),
      ).toBe("LUGAS_ASSET_002");
      // Two mounts overlap.
      expect(
        errCode(() =>
          defineApp({
            assets: {
              dirs: { "/assets/*": join(PUB, "assets"), "/assets/static/*": join(PUB, "assets") },
            },
          }),
        ),
      ).toBe("LUGAS_ASSET_002");
      // File mapping inside a mount.
      expect(
        errCode(() =>
          defineApp({
            assets: {
              files: { "/assets/app.js": join(PUB, "assets", "app.js") },
              dirs: { "/assets/*": join(PUB, "assets") },
            },
          }),
        ),
      ).toBe("LUGAS_ASSET_002");
    },
  );

  test.skipIf(process.platform !== "linux")("disjoint same-prefix siblings are accepted (Linux)", () => {
    expect(() =>
      defineApp({
        routes: { "/api/status": { GET: route({ handler: () => json(200, {}) }) } },
        assets: { dirs: { "/assets/*": join(PUB, "assets") } },
      }),
    ).not.toThrow();
  });

  test.skipIf(process.platform === "linux")(
    "rejects native directory mounts before startup on non-Linux platforms (ADR-0018 amendment)",
    () => {
      // Valid directory configuration: must fail with LUGAS_ASSET_004, not an unrelated error
      let thrown: unknown;
      try {
        defineApp({
          assets: { dirs: { "/assets/*": join(PUB, "assets") } },
        });
      } catch (e) {
        thrown = e;
      }
      const err = thrown as { name?: string; code?: string; message?: string; hint?: string };
      expect(err?.name).toBe("LugasDiagnosticError");
      expect(err?.code).toBe("LUGAS_ASSET_004");
      expect(err?.message).toContain("unsupported on platform");
      expect(err?.hint).toContain("openat2(RESOLVE_IN_ROOT)");

      // Rejection atomicity: mixed file + dir configuration rejected before listener
      expect(
        errCode(() =>
          defineApp({
            assets: {
              files: { "/index.html": join(PUB, "index.html") },
              dirs: { "/assets/*": join(PUB, "assets") },
            },
          }),
        ),
      ).toBe("LUGAS_ASSET_004");
    },
  );
});
