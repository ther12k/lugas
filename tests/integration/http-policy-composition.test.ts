/**
 * HTTP policy composition (#449).
 *
 * Every policy on at once, over real sockets, to check the cross-feature
 * contract that the per-feature suites (cors, compression, production, forms,
 * static/spa) each see only one side of. Each group names the document its
 * expectations come from, and says so where a fact is observed but not yet
 * documented. Facts already pinned by a feature suite are not restated here.
 *
 * 1. CORS + secureHeaders + compression + etag on one response — docs/compression.md, docs/cors.md
 * 2. Preflights — docs/cors.md; preflights skip secureHeaders — docs/production.md
 * 3. Guard and validation rejections — no validator on failure statuses (docs/compression.md), policy on errors (docs/cors.md)
 * 4. SSE and multipart ceilings — docs/compression.md, docs/uploads.md
 * 5. Health, assets, SPA — docs/production.md, docs/spa.md
 * 6. Native directory mounts — docs/spa.md, ADR-0037
 * 7. Transport-owned vs framework-owned 413 — docs/client.md
 * 8. Logging and telemetry see the final status — docs/telemetry.md, ADR-0032
 */
import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { z } from "zod";
import {
  defineApp,
  form,
  guard,
  json,
  problem,
  route,
  sse,
} from "../../src/index";
import { createTestServer, type TestServer } from "../../src/testing";

const REPEAT = "lugas policy composition wire contract. ".repeat(60); // >2KB compressible payload
const DIST = join(import.meta.dir, "..", "static", "fixtures", "spa-dist");
const ALLOWED_ORIGIN = "https://app.example.com";
const DISALLOWED_ORIGIN = "https://unauthorized.evil";

// 1. Rejection guards
const authGuard = guard({
  name: "auth-check",
  handler: ({ request }) => {
    const auth = request.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer valid-token")) {
      return problem(401, {
        type: "https://lugas.dev/errors/unauthorized",
        title: "Unauthorized",
        detail: "Missing or invalid bearer token",
      });
    }
    return { user: "authenticated-agent" };
  },
});

const rateLimitGuard = guard({
  name: "rate-limiter",
  handler: ({ request }) => {
    if (request.headers.get("x-simulate-rate-limit") === "1") {
      return new Response(JSON.stringify({ error: "rate limit exceeded" }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": "60",
        },
      });
    }
    return {};
  },
});

function createApiComposedApp(): ReturnType<typeof defineApp> {
  return defineApp({
    cors: {
      origin: [ALLOWED_ORIGIN],
      allowedHeaders: ["authorization", "content-type", "x-client-id"],
      exposedHeaders: ["x-custom-header", "x-audit-id"],
      credentials: true,
      maxAge: 3600,
    },
    secureHeaders: {
      contentSecurityPolicy: "default-src 'self'",
      hstsMaxAge: 31536000,
    },
    compression: true,
    etag: true,
    health: {
      livenessPath: "/healthz",
      readinessPath: "/ready",
    },
    bodyBudget: 8 * 1024,
    routes: {
      "/api/data": {
        GET: route({
          handler: () =>
            json(
              200,
              { payload: REPEAT },
              {
                headers: {
                  "x-custom-header": "custom-val",
                  "x-audit-id": "audit-999",
                },
              },
            ),
        }),
      },
      "/api/guarded": {
        GET: route({
          before: [authGuard],
          handler: () => json(200, { ok: true }),
        }),
      },
      "/api/rate-limited": {
        GET: route({
          before: [rateLimitGuard],
          handler: () => json(200, { allowed: true }),
        }),
      },
      "/api/validated": {
        POST: route({
          body: z.object({
            username: z.string().min(3),
            role: z.enum(["admin", "user"]),
          }),
          handler: (ctx) => json(201, { created: ctx.body }),
        }),
      },
      "/api/events": {
        GET: route({
          handler: () =>
            sse({
              start: (stream) => {
                stream.send({ event: "init", data: "live" });
                stream.close();
              },
            }),
        }),
      },
      "/api/upload": {
        POST: route({
          body: form({ maxFileSize: 300 }),
          handler: (ctx) => json(200, { fieldCount: Object.keys(ctx.body.fields).length }),
        }),
      },
    },
  });
}

function createSpaAndAssetsApp(): ReturnType<typeof defineApp> {
  return defineApp({
    secureHeaders: {
      contentSecurityPolicy: "default-src 'self'",
      hstsMaxAge: 31536000,
    },
    compression: true,
    etag: true,
    assets: {
      files: {
        "/assets/app-4f8a1b.js": {
          path: join(DIST, "assets", "app-4f8a1b.js"),
          cacheControl: "public, max-age=31536000, immutable",
        },
        "/robots.txt": join(DIST, "robots.txt"), // string form: served natively
      },
    },
    spa: {
      shell: join(DIST, "index.html"),
      navigations: ["/", "/app/*"],
    },
  });
}

function buildMultipart(parts: Array<{ name: string; filename?: string; value: string }>): {
  body: string;
  contentType: string;
} {
  const boundary = "----formboundary" + Math.random().toString(36).slice(2);
  const segments = parts.map((p) => {
    const headers =
      p.filename !== undefined
        ? `Content-Disposition: form-data; name="${p.name}"; filename="${p.filename}"\r\nContent-Type: application/octet-stream`
        : `Content-Disposition: form-data; name="${p.name}"`;
    return `--${boundary}\r\n${headers}\r\n\r\n${p.value}\r\n`;
  });
  return {
    body: segments.join("") + `--${boundary}--\r\n`,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe("HTTP Policy Composition Matrix (#449)", () => {
  let apiServer: TestServer;
  let spaServer: TestServer;

  apiServer = createTestServer(createApiComposedApp());
  spaServer = createTestServer(createSpaAndAssetsApp());

  afterAll(async () => {
    await apiServer.stop();
    await spaServer.stop();
  });

  describe("1. Full API policy stack: Compression, ETag, CORS, and SecureHeaders", () => {
    test("GET negotiated with gzip + Origin carries composed headers and decompressable payload", async () => {
      const res = await apiServer.fetch("/api/data", {
        headers: {
          origin: ALLOWED_ORIGIN,
          "accept-encoding": "gzip",
        },
      });

      expect(res.status).toBe(200);

      // Compression applied & declared
      expect(res.headers.get("content-encoding")).toBe("gzip");

      // Vary header composition: must contain both Accept-Encoding and Origin
      const vary = res.headers.get("vary") ?? "";
      expect(vary).toContain("Accept-Encoding");
      expect(vary).toContain("Origin");

      // CORS headers present
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
      expect(res.headers.get("access-control-expose-headers")).toContain("x-custom-header");
      expect(res.headers.get("access-control-expose-headers")).toContain("x-audit-id");

      // SecureHeaders present
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("content-security-policy")).toBe("default-src 'self'");
      expect(res.headers.get("strict-transport-security")).toContain("max-age=31536000");

      // ETag present (strong SHA-1)
      const etag = res.headers.get("etag");
      expect(etag).toMatch(/^"[0-9a-f]{40}"$/);

      // Payload integrity
      const data = (await res.json()) as { payload: string };
      expect(data.payload).toBe(REPEAT);
    });

    test("Conditional GET with matching If-None-Match yields 304 without body or Content-Encoding", async () => {
      // Step 1: get initial etag
      const initial = await apiServer.fetch("/api/data");
      const etag = initial.headers.get("etag")!;
      expect(etag).toBeTruthy();
      await initial.text();

      // Step 2: send conditional GET with accept-encoding and origin
      const conditional = await apiServer.fetch("/api/data", {
        headers: {
          origin: ALLOWED_ORIGIN,
          "if-none-match": etag,
          "accept-encoding": "gzip",
        },
      });

      expect(conditional.status).toBe(304);
      expect(conditional.headers.get("etag")).toBe(etag);

      // RFC 9110 / Lugas contract: 304 strips representation headers
      expect(conditional.headers.get("content-encoding")).toBeNull();
      expect(conditional.headers.get("content-type")).toBeNull();
      expect(conditional.headers.get("content-length")).toBeNull();

      // Preserves metadata & policy headers
      const vary = conditional.headers.get("vary") ?? "";
      expect(vary).toContain("Accept-Encoding");
      expect(vary).toContain("Origin");
      expect(conditional.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(conditional.headers.get("x-content-type-options")).toBe("nosniff");

      // Body must be empty
      const bodyText = await conditional.text();
      expect(bodyText).toBe("");
    });

    test("HEAD request preserves ETag and policies without body", async () => {
      const res = await apiServer.fetch("/api/data", {
        method: "HEAD",
        headers: {
          origin: ALLOWED_ORIGIN,
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("etag")).toMatch(/^"[0-9a-f]{40}"$/);
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(await res.text()).toBe("");
    });

    test("Conditional HEAD request yields 304 without body", async () => {
      const initial = await apiServer.fetch("/api/data");
      const etag = initial.headers.get("etag")!;
      await initial.text();

      const conditionalHead = await apiServer.fetch("/api/data", {
        method: "HEAD",
        headers: {
          origin: ALLOWED_ORIGIN,
          "if-none-match": etag,
        },
      });

      expect(conditionalHead.status).toBe(304);
      expect(conditionalHead.headers.get("etag")).toBe(etag);
      expect(conditionalHead.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(conditionalHead.headers.get("x-content-type-options")).toBe("nosniff");
      expect(await conditionalHead.text()).toBe("");
    });
  });

  describe("2. CORS Preflights and Origin Boundaries", () => {
    // docs/cors.md "Preflight interception": 204 before application handlers,
    // full header set when allowed. docs/production.md "CORS composes": the
    // secure-headers policy applies inside the CORS wrapper, so preflights
    // skip it. This is the fallback path — /api/data declares no OPTIONS.
    test("allowed preflight: 204, full CORS header set, no secureHeaders policy, no compression/etag", async () => {
      const preflight = await apiServer.fetch("/api/data", {
        method: "OPTIONS",
        headers: {
          origin: ALLOWED_ORIGIN,
          "access-control-request-method": "GET",
          "access-control-request-headers": "authorization, x-client-id",
        },
      });

      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(preflight.headers.get("access-control-allow-credentials")).toBe("true");

      expect(preflight.headers.get("access-control-max-age")).toBe("3600");
      expect(preflight.headers.get("vary")?.toLowerCase().split(/\s*,\s*/)).toContain("origin");

      const allowMethods = preflight.headers.get("access-control-allow-methods") ?? "";
      expect(allowMethods).toContain("GET");
      expect(allowMethods).toContain("HEAD");

      const allowHeaders = preflight.headers.get("access-control-allow-headers") ?? "";
      expect(allowHeaders).toContain("authorization");
      expect(allowHeaders).toContain("x-client-id");

      // Preflights skip the secureHeaders policy (documented), and never
      // reach etag or compression.
      expect(preflight.headers.get("x-content-type-options")).toBeNull();
      expect(preflight.headers.get("content-encoding")).toBeNull();
      expect(preflight.headers.get("etag")).toBeNull();
      expect(await preflight.text()).toBe("");
    });

    test("denied-origin preflight: 204 with Vary only", async () => {
      const preflight = await apiServer.fetch("/api/data", {
        method: "OPTIONS",
        headers: {
          origin: DISALLOWED_ORIGIN,
          "access-control-request-method": "GET",
        },
      });

      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("vary")).toContain("Origin");
      expect([...preflight.headers.keys()].filter((name) => name.startsWith("access-control-"))).toEqual([]);
    });
  });

  describe("3. Error and Guard Rejections: Wire Integrity", () => {
    test("401 Unauthorized guard short-circuit retains CORS and secureHeaders, carries no framework ETag", async () => {
      const res = await apiServer.fetch("/api/guarded", {
        headers: {
          origin: ALLOWED_ORIGIN,
        },
      });

      expect(res.status).toBe(401);
      expect(res.headers.get("content-type")).toContain("application/problem+json");

      // CORS and secure headers must be applied even on error
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");

      // Rule: error responses never carry framework ETag (prevents masking errors with 304)
      expect(res.headers.get("etag")).toBeNull();

      const prob = (await res.json()) as { title: string; detail: string };
      expect(prob.title).toBe("Unauthorized");
    });

    // A guard that returns a 429 Response (not the rateLimit() guard of
    // ADR-0034 — this row is about how a short-circuit composes, not about
    // the limiter).
    test("429 from a guard short-circuit keeps its own headers plus CORS and secureHeaders, no framework ETag", async () => {
      const res = await apiServer.fetch("/api/rate-limited", {
        headers: {
          origin: ALLOWED_ORIGIN,
          "x-simulate-rate-limit": "1",
        },
      });

      expect(res.status).toBe(429);
      expect(res.headers.get("retry-after")).toBe("60");
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("etag")).toBeNull();
    });

    test("422 Validation failure produces RFC 9457 Problem Details with CORS and secureHeaders", async () => {
      const res = await apiServer.fetch("/api/validated", {
        method: "POST",
        headers: {
          origin: ALLOWED_ORIGIN,
          "content-type": "application/json",
        },
        body: JSON.stringify({ username: "a", role: "unknown_role" }),
      });

      expect(res.status).toBe(422);
      expect(res.headers.get("content-type")).toContain("application/problem+json");
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("etag")).toBeNull();

      const problemDoc = (await res.json()) as { code: string; issues: unknown[] };
      expect(problemDoc.code).toBe("VALIDATION_FAILED");
      expect(Array.isArray(problemDoc.issues)).toBe(true);
    });
  });

  describe("4. Streaming & Upload Boundaries", () => {
    test("SSE streams never receive compression or ETag, retain CORS and secureHeaders", async () => {
      const res = await apiServer.fetch("/api/events", {
        headers: {
          origin: ALLOWED_ORIGIN,
          "accept-encoding": "gzip, deflate",
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      expect(res.headers.get("cache-control")).toBe("no-cache");

      // Critical assertion: compression & etag MUST NOT touch SSE
      expect(res.headers.get("content-encoding")).toBeNull();
      expect(res.headers.get("etag")).toBeNull();

      // Policy composition
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");

      const body = await res.text();
      expect(body).toContain("event: init\ndata: live\n\n");
    });

    test("Multipart exceeding form limit returns 413 Problem with CORS and secureHeaders", async () => {
      const largeFileContent = "X".repeat(400); // Exceeds maxFileSize of 300
      const mp = buildMultipart([{ name: "file", filename: "test.bin", value: largeFileContent }]);

      const res = await apiServer.fetch("/api/upload", {
        method: "POST",
        headers: {
          origin: ALLOWED_ORIGIN,
          "content-type": mp.contentType,
        },
        body: mp.body,
      });

      expect(res.status).toBe(413);
      expect(res.headers.get("content-type")).toContain("application/problem+json");
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("etag")).toBeNull();

      const doc = (await res.json()) as { code: string };
      expect(doc.code).toBe("FORM_LIMIT_EXCEEDED");
    });
  });

  // docs/production.md "Health and readiness": `200 {"status":"ok"}` and, once
  // init has settled, `200 {"status":"ready"}`. Health endpoints are mounted
  // with logging → secureHeaders → CORS, so they carry the policies this app has on.
  describe("5. Health, assets, and SPA boundaries", () => {
    test("liveness: 200 { status: 'ok' } with CORS and secureHeaders", async () => {
      const res = await apiServer.fetch("/healthz", {
        headers: {
          origin: ALLOWED_ORIGIN,
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("ok");
    });

    test("readiness: 200 { status: 'ready' } with CORS and secureHeaders", async () => {
      const res = await apiServer.fetch("/ready", {
        headers: {
          origin: ALLOWED_ORIGIN,
        },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("ready");
    });

    // Which static responses a policy reaches is the cross-feature question.
    // docs/production.md "Coverage" and docs/spa.md: the { path, cacheControl }
    // object form and the SPA shell are pipeline handlers and carry the
    // secure-headers policy; string-form mappings and `dirs` mounts stay
    // native and carry no pipeline headers. (The forms themselves are pinned
    // in tests/static/spa.test.ts; these rows run them with every policy on.)
    test("object-form asset: immutable cacheControl and the secure-headers policy", async () => {
      const res = await spaServer.fetch("/assets/app-4f8a1b.js");

      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(await res.text()).toBe(await Bun.file(join(DIST, "assets", "app-4f8a1b.js")).text());
    });

    test("string-form asset: served natively, no secure-headers policy", async () => {
      const res = await spaServer.fetch("/robots.txt");

      expect(res.status).toBe(200);
      expect(res.headers.get("x-content-type-options")).toBeNull();
      expect(await res.text()).toBe(await Bun.file(join(DIST, "robots.txt")).text());
    });

    test("SPA navigation: the shell carries the secure-headers policy and revalidation caching", async () => {
      const res = await spaServer.fetch("/app/dashboard");

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(res.headers.get("cache-control")).toBe("no-cache");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(await res.text()).toBe(await Bun.file(join(DIST, "index.html")).text());
    });

    test("a path that is neither asset nor navigation: the app's not-found Problem, not the shell", async () => {
      const res = await spaServer.fetch("/nothing-here");

      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/problem+json");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(await res.text()).not.toBe(await Bun.file(join(DIST, "index.html")).text());
    });
  });

  // Intentionally unsupported combinations (LUGAS_CORS_004: cors needs the
  // pipeline) are owned by tests/cors/config.test.ts and are not restated here.

  // Native `dirs` mounts are Linux-only (ADR-0018 amendment). Bun evaluates
  // even skipped describe callbacks, so build the app inside the test body.
  describe("6. Native directory mount with response policies enabled", () => {
    test.skipIf(process.platform !== "linux")("dir-mounted file is served natively: no secure-headers policy and no framework validator", async () => {
      const server = createTestServer(
        defineApp({
          secureHeaders: true,
          compression: true,
          etag: true,
          assets: { dirs: { "/static/*": join(DIST, "assets") } },
        }),
      );
      try {
        const res = await server.fetch("/static/app-4f8a1b.js");

        expect(res.status).toBe(200);
        expect(res.headers.get("x-content-type-options")).toBeNull();
        expect(await res.text()).toBe(await Bun.file(join(DIST, "assets", "app-4f8a1b.js")).text());
        // Bun may stamp its own weak validator on a file it serves. A framework
        // validator is a strong quoted SHA-1 and must never reach a native mount.
        const etag = res.headers.get("etag");
        if (etag !== null) expect(etag).not.toMatch(/^"[0-9a-f]{40}"$/);
      } finally {
        await server.stop();
      }
    });
  });

  // docs/client.md "Two honest boundaries": Bun's `maxRequestBodySize` can
  // reject a request before the framework sees it — empty body, no Problem
  // document. The same request under the ceiling but over a route budget is a
  // framework 413. The ceiling is a server option the test helper does not
  // expose, hence `app.serve()` directly (as tests/security/body-budgets.test.ts).
  describe("7. Transport-owned vs framework-owned 413", () => {
    test("only the framework 413 is a Problem document that CORS and secureHeaders reach", async () => {
      let handlerRuns = 0;
      const app = defineApp({
        cors: { origin: [ALLOWED_ORIGIN], credentials: true },
        secureHeaders: true,
        routes: {
          "/api/echo": {
            POST: route({
              budget: 16,
              body: z.object({ v: z.string() }),
              handler: () => {
                handlerRuns += 1;
                return json(200, { ok: true });
              },
            }),
          },
        },
      });
      const server = app.serve({ port: 0, development: false, maxRequestBodySize: 64 });
      const base = new URL(server.url).origin;
      const post = (padding: number): Promise<Response> =>
        fetch(`${base}/api/echo`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: ALLOWED_ORIGIN },
          body: JSON.stringify({ v: "x".repeat(padding) }),
        });
      try {
        // 48 bytes: over the route budget (16), under Bun's ceiling (64).
        const framework = await post(40);
        expect(framework.status).toBe(413);
        expect(framework.headers.get("content-type")).toContain("application/problem+json");
        expect(((await framework.json()) as { code: string }).code).toBe("BODY_BUDGET_EXCEEDED");
        expect(framework.headers.get("access-control-allow-origin")).toBe(ALLOWED_ORIGIN);
        expect(framework.headers.get("x-content-type-options")).toBe("nosniff");

        // 108 bytes: above Bun's ceiling — answered by Bun before any Lugas policy runs.
        const transport = await post(100);
        expect(transport.status).toBe(413);
        expect(await transport.text()).toBe("");
        expect(transport.headers.get("content-type")).toBeNull();
        // docs/client.md: even an allowed origin gets no CORS headers on Bun's 413.
        expect(transport.headers.get("access-control-allow-origin")).toBeNull();
        expect(transport.headers.get("vary")).toBeNull();
        expect(transport.headers.get("x-content-type-options")).toBeNull();

        expect(handlerRuns).toBe(0);
      } finally {
        server.stop(true);
      }
    });
  });

  // docs/telemetry.md: with `logging.requestIds` on, one id appears in the
  // telemetry events, the `x-request-id` header, and the access log, and the
  // end event carries the response status. This checks the observable ID
  // and status, not the order of wrappers that preserve them.
  describe("8. Logging and telemetry report the final response", () => {
    test("a conditional 304 is logged and reported as 304, under one shared request id", async () => {
      const access: Array<Record<string, unknown>> = [];
      const ends: Array<{ status: number; requestId: string | undefined }> = [];
      const server = createTestServer(
        defineApp({
          cors: { origin: [ALLOWED_ORIGIN] },
          secureHeaders: true,
          compression: true,
          etag: true,
          logging: {
            access: true,
            requestIds: true,
            sink: (entry) => {
              access.push(entry.fields as Record<string, unknown>);
            },
          },
          telemetry: {
            onRequestEnd: (event) => {
              ends.push({ status: event.status, requestId: event.requestId });
            },
          },
          routes: {
            "/api/data": {
              GET: route({ handler: () => json(200, { payload: REPEAT }) }),
            },
          },
        }),
      );
      try {
        const first = await server.fetch("/api/data");
        const etag = first.headers.get("etag");
        expect(etag).toMatch(/^"[0-9a-f]{40}"$/);
        await first.text();
        access.length = 0;
        ends.length = 0;

        const conditional = await server.fetch("/api/data", { headers: { "if-none-match": etag! } });
        expect(conditional.status).toBe(304);
        const requestId = conditional.headers.get("x-request-id");
        if (!requestId) throw new Error("conditional response is missing a non-empty x-request-id");

        expect(access).toHaveLength(1);
        expect(access.at(-1)).toMatchObject({ status: 304, requestId });
        expect(ends).toEqual([{ status: 304, requestId }]);
      } finally {
        await server.stop();
      }
    });
  });
});
