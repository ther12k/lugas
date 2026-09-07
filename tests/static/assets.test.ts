import { describe, expect, test } from "bun:test";
import { existsSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";
import { defineModule } from "../../src/core/module";
import { guard } from "../../src/core/guard";
import { sendRawRequest } from "./raw-http";

/**
 * M7-001 — opt-in public asset serving (ADR-0018).
 *
 * All assertions run through Lugas's assembled routing configuration (a real
 * `app.serve()` server), not isolated Bun probes. Platform labels: containment
 * behavior in this file was verified on linux-x64, Bun 1.4.0; macOS/Windows
 * lanes are CI matrix work (not exercised in this suite).
 */
const PUB = join(import.meta.dir, "fixtures", "public");
const SYMLINK = join(PUB, "assets", "leak.txt");

type Result = { status: number; contentType: string | null; body: string; headers: Headers };

async function serve(config: Parameters<typeof defineApp>[0]): Promise<{ server: Bun.Server<unknown>; get: (path: string, init?: RequestInit) => Promise<Result>; base: string; app: ReturnType<typeof defineApp> }> {
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

function appConfig(overrides: Record<string, unknown> = {}) {
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

describe("M7-001 routing and methods (assembled routing, both mapping forms)", () => {
  test("exact API route and both asset mapping forms coexist", async () => {
    const { server, get } = await serve(appConfig());
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
    const { server, get, base } = await serve(appConfig());
    try {
      for (const path of ["/index.html", "/assets/app.js"]) {
        const head = await fetch(base + path, { method: "HEAD" });
        expect(head.status).toBe(200);
        expect((await head.arrayBuffer()).byteLength).toBe(0);

        for (const method of ["POST", "PUT", "DELETE"] as const) {
          const r = await get(path, { method });
          // Documented not-found outcome through assembled routing: the app's
          // notFound policy answers — no 405 promised, no file bytes, no shell.
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
    const { server, get } = await serve(appConfig());
    try {
      // Unknown path inside an API-owned prefix: API not-found (JSON), never an asset.
      const apiMiss = await get("/api/nope");
      expect(apiMiss.status).toBe(404);
      expect(apiMiss.body).toBe(JSON.stringify({ problem: "app-404" }));

      // Missing file inside an asset-owned namespace: native asset 404 — no HTML fall-through.
      const assetMiss = await get("/assets/nope.js");
      expect(assetMiss.status).toBe(404);
      expect(assetMiss.body).not.toContain("<");
      expect(assetMiss.body).not.toContain("app-404");

      // Unmatched path anywhere: the app's not-found policy.
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
});

describe("M7-001 native HTTP behavior", () => {
  test("MIME types, range requests, and caching validators retain native behavior", async () => {
    const { server, base, get } = await serve(appConfig());
    try {
      const css = await get("/assets/styles.css");
      expect(css.contentType).toContain("text/css");

      const range = await fetch(base + "/assets/app.js", { headers: { range: "bytes=0-3" } });
      const expected = await Bun.file(join(PUB, "assets", "app.js")).text();
      expect(range.status).toBe(206);
      expect(range.headers.get("content-range")).toContain(`/${Buffer.byteLength(expected)}`);
      expect(range.headers.get("accept-ranges")).toBe("bytes");
      expect(await range.text()).toBe(expected.slice(0, 4));

      const full = await fetch(base + "/assets/app.js");
      const etag = full.headers.get("etag");
      const lastModified = full.headers.get("last-modified");
      expect(etag).not.toBeNull();
      expect(lastModified).not.toBeNull();
      const conditional = await fetch(base + "/assets/app.js", { headers: { "if-none-match": etag! } });
      expect(conditional.status).toBe(304);
    } finally {
      server.stop(true);
    }
  });

  test("missing assets return the native 404 in development and production modes", async () => {
    for (const development of [true, false]) {
      const app = defineApp(appConfig({}) as never);
      const server = app.serve({ port: 0, development });
      try {
        const r = await fetch(`http://localhost:${server.port}/assets/nope.js`);
        expect(r.status).toBe(404);
        const body = await r.text();
        expect(body).not.toContain("<"); // never the Bun development error page or any HTML
        expect(body).not.toContain(process.cwd());
        expect(body).not.toContain("ENOENT");
      } finally {
        server.stop(true);
      }
    }
  });
});

describe("M7-001 containment (platform: linux-x64, Bun 1.4.0)", () => {
  test("mounts never serve outside their directory (linux-x64, Bun 1.4.0)", async () => {
    // dir-only mount: public/index.html exists on disk one level above the
    // mount root but is not a route — the mount must not serve it.
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

  test("encoded dot-segments are route-normalized: re-dispatch equals the direct request (linux-x64, Bun 1.4.0)", async () => {
    // Verified mechanism: Bun normalizes encoded dot-segments against the
    // route table before matching. A traversal that normalizes onto a
    // declared route serves exactly that route's response — equivalent to
    // the client requesting the normalized path; the mount itself never
    // escapes its directory (asserted above).
    const { server, base } = await serve(appConfig());
    try {
      const direct = await fetch(base + "/index.html");
      const viaTraversal = await fetch(base + "/assets/%2e%2e/index.html");
      expect(viaTraversal.status).toBe(direct.status);
      expect(await viaTraversal.text()).toBe(await direct.text());
    } finally {
      server.stop(true);
    }
  });

  test.skipIf(process.platform !== "linux")("symlinked entry pointing outside the served tree does not serve (linux-x64 only; other platforms: NOT EXERCISED)", async () => {
    // Deliberately linux-gated via skipIf so the skip is VISIBLE in non-linux
    // runs: symlink containment is verified on linux-x64 only; macOS/Windows
    // lanes must assert their own behavior before any containment claim.
    if (!existsSync(SYMLINK)) symlinkSync("/etc/hostname", SYMLINK);
    try {
      const { server, get } = await serve(appConfig());
      try {
        const r = await get("/assets/leak.txt");
        expect(r.status).toBe(404);
        expect(r.body).not.toContain("hostname");
      } finally {
        server.stop(true);
      }
    } finally {
      if (existsSync(SYMLINK)) unlinkSync(SYMLINK);
    }
  });

  test("case variations follow the tested platform's filesystem semantics (per-platform pin)", async () => {
    const { server, get } = await serve(appConfig());
    try {
      const r = await get("/assets/App.js");
      if (process.platform === "linux") {
        // linux-x64: case-sensitive filesystem — the variation is a miss.
        expect(r.status).toBe(404);
      } else {
        // darwin/windows: case-insensitive default filesystems — the variation
        // RESOLVES. This is the documented hazard: overlapping route protection
        // must never rely on case-sensitive routing over such filesystems
        // (ADR-0018 public-directory boundary). Pinned as platform truth, not
        // as a containment pass.
        expect(r.status).toBe(200);
      }
    } finally {
      server.stop(true);
    }
  });
});

describe("M7-001 framework boundaries", () => {
  test("asset requests bypass the request pipeline: no guards, no onError; manifest stays asset-free", async () => {
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
      assets: { dirs: { "/assets/*": join(PUB, "assets") } },
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

      const asset = await fetch(b + "/assets/app.js");
      expect(asset.status).toBe(200);
      const miss = await fetch(b + "/assets/nope.js");
      expect(miss.status).toBe(404);
      expect(guardRuns).toBe(1); // unchanged — assets bypass guards
      expect(errorRuns).toBe(0); // native serving never triggers the error policy

      // Manifest v1 records API route facts only; asset values are outside it.
      const manifestRoutes = JSON.stringify(app.manifest.routes);
      expect(manifestRoutes).toContain("/api/secret");
      expect(manifestRoutes).not.toContain("/assets");
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
      // Direct: guard rejects, handler never runs.
      const direct = await fetch(base + "/api/private");
      expect(direct.status).toBe(401);
      expect(guardRuns).toBe(1);
      expect(handlerRuns).toBe(0);

      // High-level client with the encoded spelling: the URL parser normalizes
      // it to /api/private before the server sees it — the guard decision
      // must be identical, the handler still gated, no asset bytes returned.
      const encoded = await fetch(base + "/assets/%2e%2e/api/private");
      expect(encoded.status).toBe(401);
      expect(JSON.parse(await encoded.text())).toEqual({ error: "unauthorized" });
      expect(guardRuns).toBe(2);
      expect(handlerRuns).toBe(0);

      // Authenticated: the normalized spelling reaches the handler identically.
      const ok = await fetch(base + "/assets/%2e%2e/api/private", { headers: { authorization: "Bearer tok" } });
      expect(ok.status).toBe(200);
      expect(await ok.text()).toContain("protected-payload");
      expect(handlerRuns).toBe(1);
      expect(guardRuns).toBe(3);

      // Raw request-target sent verbatim (provenance per raw-request.test.ts):
      // the server declines the encoded target at the native routing layer —
      // bare 404, empty body; the route, its guard, and its handler are never
      // reached, and no protected bytes appear.
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
});

describe("M7-001 consumer integration (no-build page, stage one)", () => {
  test("HTML, JavaScript, and CSS load from the application origin; served script calls the API", async () => {
    const { server, base } = await serve(appConfig());
    try {
      // Exactly the requests a no-build browser would make for the page.
      const page = await fetch(base + "/index.html");
      expect(page.status).toBe(200);
      const html = await page.text();
      expect(html).toContain('/assets/app.js');

      const scriptResponse = await fetch(base + "/assets/app.js");
      expect(scriptResponse.status).toBe(200);
      expect(scriptResponse.headers.get("content-type")).toContain("text/javascript");

      const cssResponse = await fetch(base + "/assets/styles.css");
      expect(cssResponse.status).toBe(200);
      expect(cssResponse.headers.get("content-type")).toContain("text/css");

      // Execute the actual served script artifact (stage one: Bun's fetch
      // stands in for the browser; real-browser execution is M7-005 evidence).
      const script = await scriptResponse.text();
      const run = new Function(`${script}; return colorjoyMain;`)() as (fetchImpl: (input: string, init?: RequestInit) => Promise<unknown>) => Promise<unknown>;
      const originFetch = (input: string, init?: RequestInit) => fetch(base + input, init);
      expect(await run(originFetch)).toEqual({ pong: true });
    } finally {
      server.stop(true);
    }
  });
});
