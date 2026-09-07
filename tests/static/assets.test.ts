import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";
import { defineModule } from "../../src/core/module";
import { guard } from "../../src/core/guard";
import { sendRawRequest } from "./raw-http";

/**
 * M7-001 — opt-in public asset serving (ADR-0018, as amended).
 *
 * Scope under amended ADR-0018:
 * - Explicit file mappings (`assets.files`) are supported across all platforms (Linux, macOS, Windows).
 * - Native directory mounts (`assets.dirs`) are supported on Linux only, where Bun relies on
 *   Linux kernel `openat2(RESOLVE_IN_ROOT)` for symlink containment.
 * - On non-Linux platforms (macOS, Windows), configuring nonempty `assets.dirs` fails closed
 *   at startup with `LUGAS_ASSET_004` before registering routes or opening a listener.
 */
const PUB = join(import.meta.dir, "fixtures", "public");

type Result = { status: number; contentType: string | null; body: string; headers: Headers };
type LugasDiagnosticErrorLike = Error & { code?: string; hint?: string; context?: Record<string, unknown> };

async function serve(config: Parameters<typeof defineApp>[0]): Promise<{
  server: Bun.Server<unknown>;
  get: (path: string, init?: RequestInit) => Promise<Result>;
  base: string;
  app: ReturnType<typeof defineApp>;
}> {
  const app = defineApp(config as never);
  const server = app.serve({ port: 0, development: false });
  const base = `http://localhost:${server.port}`;
  return {
    server,
    base,
    app,
    get: async (path, init) => {
      const r = await fetch(base + path, init);
      return { status: r.status, contentType: r.headers.get("content-type"), body: await r.text(), headers: r.headers };
    },
  };
}

function fileAppConfig(overrides: Record<string, unknown> = {}) {
  return {
    routes: {
      "/api/ping": {
        GET: route({ handler: () => json(200, { pong: true }) }),
      },
    },
    assets: {
      files: { "/index.html": join(PUB, "index.html") },
    },
    notFound: () => new Response(JSON.stringify({ problem: "app-404" }), { status: 404, headers: { "content-type": "application/json" } }),
    ...overrides,
  };
}

function linuxDirAppConfig(overrides: Record<string, unknown> = {}) {
  return {
    routes: {
      "/api/ping": {
        GET: route({ handler: () => json(200, { pong: true }) }),
      },
    },
    assets: {
      files: { "/index.html": join(PUB, "index.html") },
      dirs: { "/assets/*": join(PUB, "assets") },
    },
    notFound: () => new Response(JSON.stringify({ problem: "app-404" }), { status: 404, headers: { "content-type": "application/json" } }),
    ...overrides,
  };
}

describe("M7-001 cross-platform explicit file mappings (Linux, macOS, Windows)", () => {
  test("exact API route and file mappings coexist", async () => {
    const { server, get } = await serve(fileAppConfig());
    try {
      const api = await get("/api/ping");
      expect(api.status).toBe(200);
      expect(JSON.parse(api.body)).toEqual({ pong: true });

      const fileMapping = await get("/index.html");
      expect(fileMapping.status).toBe(200);
      expect(fileMapping.contentType).toContain("text/html");
      expect(fileMapping.body).toContain("<!doctype html>");
    } finally {
      server.stop(true);
    }
  });

  test("HEAD sends no file body; disallowed methods reach not-found without file bytes", async () => {
    const { server, get, base } = await serve(fileAppConfig());
    try {
      const head = await fetch(base + "/index.html", { method: "HEAD" });
      expect(head.status).toBe(200);
      expect((await head.arrayBuffer()).byteLength).toBe(0);

      for (const method of ["POST", "PUT", "DELETE"] as const) {
        const r = await get("/index.html", { method });
        expect(r.status).toBe(404);
        expect(r.body).toBe(JSON.stringify({ problem: "app-404" }));
        expect(r.body).not.toContain("<!doctype html>");
      }
    } finally {
      server.stop(true);
    }
  });

  test("file mappings support content-type and caching validators", async () => {
    const { server, base } = await serve(fileAppConfig());
    try {
      const full = await fetch(base + "/index.html");
      expect(full.status).toBe(200);
      expect(full.headers.get("content-type")).toContain("text/html");

      const lastModified = full.headers.get("last-modified");
      expect(lastModified).not.toBeNull();
      const conditional = await fetch(base + "/index.html", { headers: { "if-modified-since": lastModified! } });
      expect(conditional.status).toBe(304);
    } finally {
      server.stop(true);
    }
  });

  test("missing files and unknown paths return expected 404 in dev and prod", async () => {
    for (const development of [true, false]) {
      const app = defineApp(fileAppConfig() as never);
      const server = app.serve({ port: 0, development });
      try {
        const r = await fetch(`http://localhost:${server.port}/unknown-file.txt`);
        expect(r.status).toBe(404);
        const body = await r.text();
        expect(body).not.toContain("<");
        expect(body).not.toContain(process.cwd());
        expect(body).not.toContain("ENOENT");
      } finally {
        server.stop(true);
      }
    }
  });

  test("file asset requests bypass the request pipeline: no guards, no onError; manifest stays asset-free", async () => {
    let guardRuns = 0;
    let errorRuns = 0;
    const spy = guard({
      name: "spy",
      handler: () => {
        guardRuns += 1;
        return {};
      },
    });
    const app = defineApp({
      routes: {
        "/api/secret": {
          GET: route({ before: [spy], handler: () => json(200, { seen: true }) }),
        },
      },
      assets: { files: { "/index.html": join(PUB, "index.html") } },
      onError: () => {
        errorRuns += 1;
        return json(500, { error: "handled" });
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const b = `http://localhost:${server.port}`;
      const api = await fetch(b + "/api/secret");
      expect(api.status).toBe(200);
      expect(guardRuns).toBe(1);

      const asset = await fetch(b + "/index.html");
      expect(asset.status).toBe(200);
      const miss = await fetch(b + "/missing.html");
      expect(miss.status).toBe(404);
      expect(guardRuns).toBe(1);
      expect(errorRuns).toBe(0);

      const manifestRoutes = JSON.stringify(app.manifest.routes);
      expect(manifestRoutes).toContain("/api/secret");
      expect(manifestRoutes).not.toContain("/index.html");
    } finally {
      server.stop(true);
    }
  });

  test("absent assets configuration preserves existing behavior exactly", async () => {
    const { server, get, app } = await serve({
      routes: { "/api/ping": { GET: route({ handler: () => json(200, { pong: true }) }) } },
      notFound: () => new Response(JSON.stringify({ problem: "app-404" }), { status: 404, headers: { "content-type": "application/json" } }),
    });
    try {
      expect((await get("/api/ping")).status).toBe(200);
      expect((await get("/index.html")).body).toBe(JSON.stringify({ problem: "app-404" }));
      const manifest = JSON.stringify(app.manifest.routes);
      expect(manifest).toContain("/api/ping");
      expect(app.manifest.routes.length).toBe(1);
    } finally {
      server.stop(true);
    }
  });

  test("empty directory map (dirs: {}) preserves file serving on all platforms", async () => {
    const { server, get } = await serve({
      routes: { "/api/ping": { GET: route({ handler: () => json(200, { pong: true }) }) } },
      assets: {
        files: { "/index.html": join(PUB, "index.html") },
        dirs: {},
      },
    });
    try {
      const page = await get("/index.html");
      expect(page.status).toBe(200);
      expect(page.body).toContain("<!doctype html>");
    } finally {
      server.stop(true);
    }
  });
});

describe.skipIf(process.platform === "linux")(
  "M7-001 non-Linux directory startup rejection (ADR-0018 amendment)",
  () => {
    test("rejects nonempty assets.dirs before server startup", () => {
      let thrown: unknown;
      try {
        defineApp({
          assets: { dirs: { "/assets/*": join(PUB, "assets") } },
        });
      } catch (err) {
        thrown = err;
      }
      const e = thrown as LugasDiagnosticErrorLike;
      expect(e?.name).toBe("LugasDiagnosticError");
      expect(e?.code).toBe("LUGAS_ASSET_004");
      expect(e?.message).toContain("unsupported on platform");
      expect(e?.hint).toContain("openat2(RESOLVE_IN_ROOT)");
    });

    test("mixed file and directory mappings: rejects entire configuration atomically without partial listener", () => {
      let listenerCreated = false;
      let thrown: unknown;
      try {
        const app = defineApp({
          routes: { "/api/ping": { GET: route({ handler: () => json(200, { ok: true }) }) } },
          assets: {
            files: { "/index.html": join(PUB, "index.html") },
            dirs: { "/assets/*": join(PUB, "assets") },
          },
        });
        const server = app.serve({ port: 0 });
        listenerCreated = true;
        server.stop(true);
      } catch (err) {
        thrown = err;
      }
      expect(listenerCreated).toBe(false);
      const e = thrown as LugasDiagnosticErrorLike;
      expect(e?.name).toBe("LugasDiagnosticError");
      expect(e?.code).toBe("LUGAS_ASSET_004");
    });

    test("outside-root symlink fixture is valid, but directory mount is rejected before server startup", () => {
      const outsideDir = mkdtempSync(join(tmpdir(), "lugas-outside-nonlinux-"));
      const sentinelFile = join(outsideDir, "sentinel.txt");
      const sentinelToken = `LUGAS_OUTSIDE_SENTINEL_${Date.now()}`;
      writeFileSync(sentinelFile, sentinelToken, "utf8");

      const linkPath = join(PUB, "assets", "outside-fixture.txt");
      try {
        if (existsSync(linkPath)) unlinkSync(linkPath);
        symlinkSync(sentinelFile, linkPath, "file");

        const resolves = readFileSync(linkPath, "utf8") === sentinelToken;
        expect(resolves).toBe(true);

        let thrown: unknown;
        try {
          defineApp({
            assets: { dirs: { "/assets/*": join(PUB, "assets") } },
          });
        } catch (err) {
          thrown = err;
        }
        const e = thrown as LugasDiagnosticErrorLike;
        expect(e?.name).toBe("LugasDiagnosticError");
        expect(e?.code).toBe("LUGAS_ASSET_004");
      } finally {
        if (existsSync(linkPath)) unlinkSync(linkPath);
        try {
          rmSync(outsideDir, { recursive: true, force: true });
        } catch {}
      }
    });
  },
);

function probeSymlinkCapability(assetsDir: string): { canSymlink: boolean; skipReason?: string } {
  const testDir = mkdtempSync(join(tmpdir(), "lugas-symlink-probe-"));
  const sentinel = join(testDir, "sentinel.txt");
  const link = join(assetsDir, ".symlink-capability-probe.txt");
  const token = `PROBE_${Date.now()}`;
  try {
    writeFileSync(sentinel, token, "utf8");
    if (existsSync(link)) unlinkSync(link);
    symlinkSync(sentinel, link, "file");
    const read = readFileSync(link, "utf8");
    if (read === token) {
      return { canSymlink: true };
    }
    return { canSymlink: false, skipReason: "created link does not resolve to sentinel content via fs" };
  } catch (err) {
    return { canSymlink: false, skipReason: String(err) };
  } finally {
    if (existsSync(link)) unlinkSync(link);
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}
  }
}

const symlinkCapability = probeSymlinkCapability(join(PUB, "assets"));

describe.skipIf(process.platform !== "linux")(
  "M7-001 Linux native directory mounts and symlink containment",
  () => {
    test("exact API route and both asset mapping forms coexist", async () => {
      const { server, get } = await serve(linuxDirAppConfig());
      try {
        const api = await get("/api/ping");
        expect(api.status).toBe(200);
        expect(JSON.parse(api.body)).toEqual({ pong: true });

        const fileMapping = await get("/index.html");
        expect(fileMapping.status).toBe(200);
        expect(fileMapping.contentType).toContain("text/html");
        expect(fileMapping.body).toContain("<!doctype html>");

        const dirMount = await get("/assets/app.js");
        expect(dirMount.status).toBe(200);
        expect(dirMount.contentType).toContain("text/javascript");
        expect(dirMount.body).toContain("colorjoyMain");
      } finally {
        server.stop(true);
      }
    });

    test("HEAD sends no asset body; disallowed methods reach not-found without file bytes — both mapping forms", async () => {
      const { server, get, base } = await serve(linuxDirAppConfig());
      try {
        for (const path of ["/index.html", "/assets/app.js"]) {
          const head = await fetch(base + path, { method: "HEAD" });
          expect(head.status).toBe(200);
          expect((await head.arrayBuffer()).byteLength).toBe(0);

          for (const method of ["POST", "PUT", "DELETE"] as const) {
            const r = await get(path, { method });
            expect(r.status).toBe(404);
            expect(r.body).toBe(JSON.stringify({ problem: "app-404" }));
            expect(r.body).not.toContain("console.log");
            expect(r.body).not.toContain("<!doctype html>");
          }
        }
      } finally {
        server.stop(true);
      }
    });

    test("API miss, asset miss, and unknown paths follow the ownership table", async () => {
      const { server, get } = await serve(linuxDirAppConfig());
      try {
        const apiMiss = await get("/api/nope");
        expect(apiMiss.status).toBe(404);
        expect(apiMiss.body).toBe(JSON.stringify({ problem: "app-404" }));

        const assetMiss = await get("/assets/nope.js");
        expect(assetMiss.status).toBe(404);
        expect(assetMiss.body).not.toContain("<");
        expect(assetMiss.body).not.toContain("app-404");

        const unknown = await get("/nothing/here");
        expect(unknown.status).toBe(404);
        expect(unknown.body).toBe(JSON.stringify({ problem: "app-404" }));
      } finally {
        server.stop(true);
      }
    });

    test("module-declared API routes own their paths against assets identically", async () => {
      const app = defineApp({
        modules: [
          defineModule({
            name: "api",
            routes: { "/mod/ping": { GET: route({ handler: () => json(200, { ok: true }) }) } },
          }),
        ],
        assets: { dirs: { "/assets/*": join(PUB, "assets") } },
      });
      const server = app.serve({ port: 0, development: false });
      try {
        const b = `http://localhost:${server.port}`;
        expect((await fetch(b + "/mod/ping")).status).toBe(200);
        expect((await fetch(b + "/assets/app.js")).status).toBe(200);
        expect((await fetch(b + "/mod/missing")).status).toBe(404);
      } finally {
        server.stop(true);
      }
    });

    test("mounts never serve outside their directory", async () => {
      const app = defineApp({ assets: { dirs: { "/assets/*": join(PUB, "assets") } } });
      const server = app.serve({ port: 0, development: false });
      try {
        for (const path of ["/assets/%2e%2e/index.html", "/assets/..%2findex.html", "/assets/%2e%2e/%2e%2e/index.html", "/assets/%252e%252e/index.html"]) {
          const r = await fetch(`http://localhost:${server.port}${path}`);
          expect(`${path}:${r.status}`).toBe(`${path}:404`);
          expect(await r.text()).not.toContain("<!doctype html>");
        }
      } finally {
        server.stop(true);
      }
    });

    test("high-level client parses and normalizes encoded dot-segments before transmission", async () => {
      const { server, base } = await serve(linuxDirAppConfig());
      try {
        const direct = await fetch(base + "/index.html");
        const viaTraversal = await fetch(base + "/assets/%2e%2e/index.html");
        expect(viaTraversal.status).toBe(direct.status);
        expect(await viaTraversal.text()).toBe(await direct.text());
      } finally {
        server.stop(true);
      }
    });

    test.skipIf(!symlinkCapability.canSymlink && !process.env.CI)(
      "symlinked entry pointing outside the served tree does not serve (capability-verified fixture)",
      async () => {
        if (!symlinkCapability.canSymlink) {
          throw new Error(
            `Fixture cannot be created or validated in CI: ${symlinkCapability.skipReason}. Requirement not exercised; merge still blocked.`,
          );
        }

        const outsideDir = mkdtempSync(join(tmpdir(), "lugas-outside-sentinel-"));
        const sentinelFile = join(outsideDir, "sentinel.txt");
        const sentinelToken = `LUGAS_OUTSIDE_SENTINEL_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        writeFileSync(sentinelFile, sentinelToken, "utf8");

        const linkPath = join(PUB, "assets", "leak-sentinel.txt");
        try {
          if (existsSync(linkPath)) unlinkSync(linkPath);
          try {
            symlinkSync(sentinelFile, linkPath, "file");
          } catch (err) {
            if (process.env.CI) {
              throw new Error(
                `Fixture cannot be created in assets directory: ${String(err)}. Requirement not exercised; merge still blocked.`,
              );
            }
            return;
          }

          let fixtureValid = false;
          try {
            fixtureValid = readFileSync(linkPath, "utf8") === sentinelToken;
          } catch {
            fixtureValid = false;
          }

          if (!fixtureValid) {
            if (process.env.CI) {
              throw new Error(
                "Fixture cannot be validated: created symlink does not resolve to outside-root sentinel via fs. Requirement not exercised; merge still blocked.",
              );
            }
            return;
          }

          const { server, get } = await serve(linuxDirAppConfig());
          try {
            const r = await get("/assets/leak-sentinel.txt");
            expect(r.body).not.toContain(sentinelToken);
            expect(r.status).toBe(404);
          } finally {
            server.stop(true);
          }
        } finally {
          if (existsSync(linkPath)) unlinkSync(linkPath);
          try {
            rmSync(outsideDir, { recursive: true, force: true });
          } catch {}
        }
      },
    );

    test("case variations follow the directory's filesystem semantics (probed filesystem truth)", async () => {
      const exactFile = join(PUB, "assets", "app.js");
      const variedFile = join(PUB, "assets", "App.js");
      expect(existsSync(exactFile)).toBe(true);

      const filesystemIsCaseInsensitive = existsSync(variedFile);

      const { server, get } = await serve(linuxDirAppConfig());
      try {
        const r = await get("/assets/App.js");
        if (filesystemIsCaseInsensitive) {
          expect(r.status).toBe(200);
          expect(r.body).toContain("colorjoyMain");
        } else {
          expect(r.status).toBe(404);
        }
      } finally {
        server.stop(true);
      }
    });

    test("encoded path normalizing onto a guarded API route preserves the guard decision (owner merge condition)", async () => {
      let guardRuns = 0;
      let handlerRuns = 0;
      const auth = guard({
        name: "auth",
        handler: (ctx) => {
          guardRuns += 1;
          if (ctx.request.headers.get("authorization") !== "Bearer tok") {
            return json(401, { error: "unauthorized" });
          }
          return {};
        },
      });
      const app = defineApp({
        routes: {
          "/api/private": {
            GET: route({
              before: [auth],
              handler: () => {
                handlerRuns += 1;
                return json(200, { secret: "protected-payload" });
              },
            }),
          },
        },
        assets: {
          files: { "/index.html": join(PUB, "index.html") },
          dirs: { "/assets/*": join(PUB, "assets") },
        },
      });
      const server = app.serve({ port: 0, development: false });
      const base = `http://localhost:${server.port}`;
      try {
        const direct = await fetch(base + "/api/private");
        expect(direct.status).toBe(401);
        expect(guardRuns).toBe(1);
        expect(handlerRuns).toBe(0);

        const encoded = await fetch(base + "/assets/%2e%2e/api/private");
        expect(encoded.status).toBe(401);
        expect(JSON.parse(await encoded.text())).toEqual({ error: "unauthorized" });
        expect(guardRuns).toBe(2);
        expect(handlerRuns).toBe(0);

        const ok = await fetch(base + "/assets/%2e%2e/api/private", { headers: { authorization: "Bearer tok" } });
        expect(ok.status).toBe(200);
        expect(await ok.text()).toContain("protected-payload");
        expect(handlerRuns).toBe(1);
        expect(guardRuns).toBe(3);

        const raw = await sendRawRequest(server.port!, "/assets/%2e%2e/api/private");
        expect(raw.status).toBe(404);
        expect(raw.body).toBe("");
        expect(guardRuns).toBe(3);
        expect(handlerRuns).toBe(1);
        expect(raw.body).not.toContain("protected-payload");
      } finally {
        server.stop(true);
      }
    });
  },
);

describe("M7-001 consumer integration (no-build page, stage one)", () => {
  test("HTML, JavaScript, and CSS load from the application origin; served script calls the API", async () => {
    const { server, base } = await serve({
      routes: {
        "/api/ping": { GET: route({ handler: () => json(200, { pong: true }) }) },
      },
      assets: {
        files: {
          "/index.html": join(PUB, "index.html"),
          "/assets/app.js": join(PUB, "assets", "app.js"),
          "/assets/styles.css": join(PUB, "assets", "styles.css"),
        },
      },
    });
    try {
      const page = await fetch(base + "/index.html");
      expect(page.status).toBe(200);
      expect(page.headers.get("content-type")).toContain("text/html");

      const script = await (await fetch(base + "/assets/app.js")).text();
      expect(script).toContain("colorjoyMain");

      const css = await fetch(base + "/assets/styles.css");
      expect(css.status).toBe(200);

      const run = new Function(`${script}; return colorjoyMain;`)() as (
        fetchImpl: (input: string, init?: RequestInit) => Promise<unknown>,
      ) => Promise<unknown>;
      const data = await run((path, init) => fetch(base + path, init));
      expect(data).toEqual({ pong: true });
    } finally {
      server.stop(true);
    }
  });
});
