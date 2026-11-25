/**
 * HTTP Policy Composition Integration Suite (#449, LNR-08).
 *
 * Exercises cross-feature compositions across the documented wire contract:
 * - CORS (ADR-0022)
 * - Secure Headers (ADR-0029)
 * - Compression and ETag (ADR-0033)
 * - Rate Limiting & Guard Short-Circuits (ADR-0027, ADR-0034)
 * - Standard Schema Validation & Problem Details (ADR-0025, RFC 9457)
 * - SSE Streaming Non-Compression & Non-ETag (ADR-0028, ADR-0036)
 * - Multipart Uploads & Form Limits (ADR-0030)
 * - Static Assets and SPA Navigation Boundaries (ADR-0037)
 * - Intentionally Unsupported Configurations (LUGAS_CORS_004)
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
  type LugasAppInstance,
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

function createApiComposedApp(): LugasAppInstance<unknown, any> {
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

function createSpaAndAssetsApp(): LugasAppInstance<unknown, any> {
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
        "/robots.txt": join(DIST, "robots.txt"),
      },
      dirs: {
        "/static/*": join(DIST, "assets"),
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

    test("Conditional GET with matching If-None-Match yields 304 without body or compression cost", async () => {
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
    test("OPTIONS preflight returns 204 with methods, headers, and secure headers, bypassing compression/etag", async () => {
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

      const allowMethods = preflight.headers.get("access-control-allow-methods") ?? "";
      expect(allowMethods).toContain("GET");
      expect(allowMethods).toContain("HEAD");

      const allowHeaders = preflight.headers.get("access-control-allow-headers") ?? "";
      expect(allowHeaders).toContain("authorization");
      expect(allowHeaders).toContain("x-client-id");

      // Preflight is handled at the outermost CORS boundary before application response wrappers
      expect(preflight.headers.get("content-encoding")).toBeNull();
      expect(preflight.headers.get("etag")).toBeNull();
      expect(await preflight.text()).toBe("");
    });

    test("Unauthorized origin preflight gets 204 with Vary: Origin but no allow-origin", async () => {
      const preflight = await apiServer.fetch("/api/data", {
        method: "OPTIONS",
        headers: {
          origin: DISALLOWED_ORIGIN,
          "access-control-request-method": "GET",
        },
      });

      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("vary")).toContain("Origin");
      expect(preflight.headers.get("access-control-allow-origin")).toBeNull();
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

    test("429 Rate-limited guard short-circuit retains custom headers, CORS and secureHeaders without ETag", async () => {
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

  describe("5. Health, Static Assets, and SPA Boundaries", () => {
    test("Liveness endpoint /healthz responds with json { status: 'ok' }, secureHeaders, and CORS", async () => {
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

    test("Readiness endpoint /ready responds with json { status: 'ready' }, secureHeaders, and CORS", async () => {
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

    test("Hashed static asset retains immutable cacheControl and secureHeaders", async () => {
      const res = await spaServer.fetch("/assets/app-4f8a1b.js");

      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });

    test("Unmatched asset path does NOT fall back to SPA shell, returning 404 with secureHeaders", async () => {
      const res = await spaServer.fetch("/assets/non-existent.js");

      expect(res.status).toBe(404);
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      const text = await res.text();
      expect(text).not.toContain("<html>");
    });

    test("SPA navigation route returns HTML shell with secureHeaders and no-cache", async () => {
      const res = await spaServer.fetch("/app/dashboard");

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(res.headers.get("cache-control")).toBe("no-cache");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      const html = await res.text();
      expect(html).toContain("<!doctype html>");
    });
  });

  describe("6. Intentionally Unsupported Configurations (LUGAS_CORS_004)", () => {
    test("Combining cors with assets configuration fails closed at defineApp", () => {
      expect(() => {
        defineApp({
          cors: { origin: "*" },
          assets: {
            files: { "/test.txt": join(DIST, "robots.txt") },
          },
          routes: {},
        });
      }).toThrow();

      try {
        defineApp({
          cors: { origin: "*" },
          assets: {
            files: { "/test.txt": join(DIST, "robots.txt") },
          },
          routes: {},
        });
        expect.unreachable();
      } catch (err) {
        expect((err as { code?: string }).code).toBe("LUGAS_CORS_004");
      }
    });

    test("Combining cors with static Response route values fails closed at defineApp", () => {
      try {
        defineApp({
          cors: { origin: "*" },
          routes: {
            "/static-val": new Response("static"),
          },
        });
        expect.unreachable();
      } catch (err) {
        expect((err as { code?: string }).code).toBe("LUGAS_CORS_004");
      }
    });
  });
});
