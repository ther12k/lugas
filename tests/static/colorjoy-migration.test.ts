import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { guard } from "../../src/core/guard";
import { json, problem } from "../../src/core/response";
import { z } from "zod";

/**
 * M7-001 Acceptance Anchor: ColorJoy same-origin migration fixture (ADR-0018).
 *
 * Demonstrates that ColorJoy replaces its handwritten static serving path
 * (`server/static.ts` with custom regex whitelist, mime map, and path validation)
 * with Lugas's opt-in native asset configuration while preserving all application
 * behavior and requiring zero build step.
 */
describe("M7-001 ColorJoy migration consumer fixture", () => {
  test.skipIf(process.platform !== "linux")(
    "ColorJoy application structure functions cleanly with native asset routes (Linux supported environment)",
    async () => {
    const root = mkdtempSync(join(tmpdir(), "colorjoy-fixture-"));
    mkdirSync(join(root, "artworks"), { recursive: true });
    mkdirSync(join(root, "source"), { recursive: true });
    mkdirSync(join(root, "server"), { recursive: true });
    mkdirSync(join(root, "data"), { recursive: true });

    // Seed ColorJoy static shell and assets
    const indexHtml = "<!doctype html><html><head><title>ColorJoy</title></head><body><div id=app>ColorJoy Studio</div></body></html>";
    writeFileSync(join(root, "index.html"), indexHtml, "utf8");
    writeFileSync(join(root, "README.md"), "# ColorJoy\n\nFree coloring studio.", "utf8");
    writeFileSync(join(root, "artworks", "cozy-cabin.svg"), "<svg viewBox='0 0 100 100'><circle cx='50' cy='50' r='40'/></svg>", "utf8");
    writeFileSync(join(root, "artworks", "catalog.json"), JSON.stringify([{ id: "cozy-cabin", title: "Cozy Cabin" }]), "utf8");

    // Seed protected files that must remain unreachable
    writeFileSync(join(root, "source", "app.js"), "// protected source code", "utf8");
    writeFileSync(join(root, "server", "app.ts"), "// protected server implementation", "utf8");
    writeFileSync(join(root, "data", "colorjoy.sqlite"), "SQLite format 3\0", "utf8");
    writeFileSync(join(root, "package.json"), "{\"name\":\"colorjoy\",\"private\":true}", "utf8");

    try {
      // In-memory document store simulation
      const docs = new Map<string, { revision: number; payload: unknown; updatedAt: number }>();

      const profileGuard = guard({
        name: "profile",
        handler: (ctx) => {
          const auth = ctx.request.headers.get("authorization");
          if (!auth || !auth.startsWith("Bearer ") || auth.length < 15) {
            return problem(401, { title: "Authentication required", detail: "Provide a valid profile token." });
          }
          return { profileId: auth.slice(7) };
        },
      });

      const putBody = z.object({
        payload: z.unknown(),
        baseRevision: z.number().int().min(0).nullable().optional(),
      });

      const documentsModule = defineModule({
        name: "documents",
        routes: {
          "/api/documents": {
            GET: route({
              before: [profileGuard],
              handler: (ctx) => {
                const row = docs.get(ctx.profileId);
                if (!row) {
                  return json(200, { revision: 0, payload: null, updatedAt: null });
                }
                return json(200, row);
              },
            }),
            PUT: route({
              before: [profileGuard],
              body: putBody,
              handler: (ctx) => {
                const current = docs.get(ctx.profileId);
                const currentRev = current ? current.revision : 0;
                if (ctx.body.baseRevision !== undefined && ctx.body.baseRevision !== null && ctx.body.baseRevision !== currentRev) {
                  return problem(409, {
                    title: "Saved project changed elsewhere",
                    currentRevision: currentRev,
                  });
                }
                const newRev = currentRev + 1;
                const record = { revision: newRev, payload: ctx.body.payload, updatedAt: Date.now() };
                docs.set(ctx.profileId, record);
                return json(200, { revision: newRev, updatedAt: record.updatedAt });
              },
            }),
          },
        },
      });

      // Migrated ColorJoy defineApp: replaces handwritten serveStatic with native assets
      const app = defineApp({
        routes: {
          "/api/health": {
            GET: route({ handler: () => json(200, { ok: true, service: "colorjoy" }) }),
          },
        },
        modules: [documentsModule],
        assets: {
          files: {
            "/": join(root, "index.html"),
            "/index.html": join(root, "index.html"),
            "/README.md": join(root, "README.md"),
          },
          dirs: {
            "/artworks/*": join(root, "artworks"),
          },
        },
      });

      const server = app.serve({ port: 0, development: false });
      const base = `http://localhost:${server.port}`;

      try {
        // 1. Static studio shell at /
        const shell = await fetch(base + "/");
        expect(shell.status).toBe(200);
        expect(shell.headers.get("content-type")).toMatch(/^text\/html;\s*charset=utf-8$/);
        const html = await shell.text();
        expect(html).toContain("ColorJoy Studio");

        // 2. Exact file mappings (/index.html, /README.md)
        const indexFile = await fetch(base + "/index.html");
        expect(indexFile.status).toBe(200);
        expect(await indexFile.text()).toContain("ColorJoy Studio");

        const readme = await fetch(base + "/README.md");
        expect(readme.status).toBe(200);
        expect(await readme.text()).toContain("Free coloring studio.");

        // 3. Directory mount assets (/artworks/*)
        const svg = await fetch(base + "/artworks/cozy-cabin.svg");
        expect(svg.status).toBe(200);
        expect(svg.headers.get("content-type")).toBe("image/svg+xml");
        expect(await svg.text()).toContain("<circle");

        const catalog = await fetch(base + "/artworks/catalog.json");
        expect(catalog.status).toBe(200);
        expect(await catalog.json()).toEqual([{ id: "cozy-cabin", title: "Cozy Cabin" }]);

        // 4. Blocked paths outside asset mappings (source, server, data, package.json, traversals)
        for (const unservedPath of [
          "/source/app.js",
          "/server/app.ts",
          "/data/colorjoy.sqlite",
          "/package.json",
          "/artworks/../../package.json",
          "/artworks/../source/app.js",
          "/no-such-file.js",
        ]) {
          const res = await fetch(base + unservedPath);
          expect(`${unservedPath}:${res.status}`).toBe(`${unservedPath}:404`);
        }

        // 5. Method contract: non-GET on asset routes returns 404 without serving bytes
        const postRoot = await fetch(base + "/", { method: "POST" });
        expect(postRoot.status).toBe(404);
        expect(await postRoot.text()).not.toContain("ColorJoy");

        const deleteSvg = await fetch(base + "/artworks/cozy-cabin.svg", { method: "DELETE" });
        expect(deleteSvg.status).toBe(404);

        // 6. API behavior preserved: /api/health
        const health = await fetch(base + "/api/health");
        expect(health.status).toBe(200);
        expect(await health.json()).toEqual({ ok: true, service: "colorjoy" });

        // 7. API behavior preserved: documents auth rejection
        const noAuth = await fetch(base + "/api/documents");
        expect(noAuth.status).toBe(401);
        expect(noAuth.headers.get("content-type")).toBe("application/problem+json");

        // 8. API behavior preserved: documents PUT + GET round-trip
        const token = "Bearer colorjoy-test-token-12345";
        const putRes = await fetch(base + "/api/documents", {
          method: "PUT",
          headers: { "content-type": "application/json", authorization: token },
          body: JSON.stringify({ payload: { canvas: "drawing", strokes: [1, 2, 3] } }),
        });
        expect(putRes.status).toBe(200);
        const putData = (await putRes.json()) as { revision: number };
        expect(putData.revision).toBe(1);

        const getRes = await fetch(base + "/api/documents", {
          headers: { authorization: token },
        });
        expect(getRes.status).toBe(200);
        const getData = (await getRes.json()) as { revision: number; payload: { canvas: string; strokes: number[] } };
        expect(getData.revision).toBe(1);
        expect(getData.payload.canvas).toBe("drawing");
      } finally {
        server.stop(true);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test.skipIf(process.platform === "linux")(
    "ColorJoy configuration with /artworks/* directory mount fails closed before startup on non-Linux platforms (ADR-0018 amendment)",
    () => {
      const root = mkdtempSync(join(tmpdir(), "colorjoy-fixture-nonlinux-"));
      mkdirSync(join(root, "artworks"), { recursive: true });
      writeFileSync(join(root, "index.html"), "<!doctype html>ColorJoy", "utf8");

      try {
        let thrown: unknown;
        try {
          defineApp({
            routes: {
              "/api/health": {
                GET: route({ handler: () => json(200, { ok: true, service: "colorjoy" }) }),
              },
            },
            assets: {
              files: {
                "/": join(root, "index.html"),
              },
              dirs: {
                "/artworks/*": join(root, "artworks"),
              },
            },
          });
        } catch (e) {
          thrown = e;
        }

        const err = thrown as { name?: string; code?: string; message?: string; hint?: string };
        expect(err?.name).toBe("LugasDiagnosticError");
        expect(err?.code).toBe("LUGAS_ASSET_004");
        expect(err?.message).toContain("unsupported on platform");
        expect(err?.hint).toContain("openat2(RESOLVE_IN_ROOT)");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );
});
