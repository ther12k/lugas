import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { validateParams } from "../../src/internal/validate-params";
import { validateQuery } from "../../src/internal/validate-query";
import { validateHeaders } from "../../src/internal/validate-headers";
import { validateBody } from "../../src/internal/validate-body";
import {
  createValidationProblem,
  createUnsupportedMediaTypeProblem,
  createMalformedJsonProblem,
  VALIDATION_PROBLEM_URI,
  UNSUPPORTED_MEDIA_TYPE_URI,
  MALFORMED_JSON_URI,
} from "../../src/internal/validation-problem";

describe("Unified validation Problem Details mapping", () => {
  test("creates unified 422 Problem Details for params validation failures", async () => {
    const paramsSchema = z.object({ id: z.coerce.number() });
    const result = validateParams(paramsSchema, { id: "not-a-number" });

    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(false);
    if (!syncResult.ok) {
      expect(syncResult.response.status).toBe(422);
      expect(syncResult.response.headers.get("content-type")).toContain("application/problem+json");
      const body = (await syncResult.response.json()) as {
        type: string;
        title: string;
        code: string;
        issues: unknown[];
      };
      expect(body).toMatchObject({
        type: VALIDATION_PROBLEM_URI,
        title: "Request validation failed",
        code: "VALIDATION_FAILED",
      });
      expect(Array.isArray(body.issues)).toBe(true);
      expect(body.issues.length).toBeGreaterThan(0);
    }
  });

  test("creates unified 422 Problem Details for query validation failures", async () => {
    const querySchema = z.object({ page: z.coerce.number().positive() });
    const req = new Request("https://example.com/search?page=-1");
    const result = validateQuery(querySchema, req);

    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(false);
    if (!syncResult.ok) {
      expect(syncResult.response.status).toBe(422);
      const body = (await syncResult.response.json()) as {
        type: string;
        title: string;
        code: string;
      };
      expect(body).toMatchObject({
        type: VALIDATION_PROBLEM_URI,
        title: "Request validation failed",
        code: "VALIDATION_FAILED",
      });
    }
  });

  test("creates unified 422 Problem Details for header validation failures", async () => {
    const headerSchema = z.object({ "x-version": z.string().min(2) });
    const req = new Request("https://example.com/", { headers: { "X-Version": "a" } });
    const result = validateHeaders(headerSchema, req);

    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(false);
    if (!syncResult.ok) {
      expect(syncResult.response.status).toBe(422);
      const body = (await syncResult.response.json()) as {
        type: string;
        title: string;
        code: string;
      };
      expect(body).toMatchObject({
        type: VALIDATION_PROBLEM_URI,
        title: "Request validation failed",
        code: "VALIDATION_FAILED",
      });
    }
  });

  test("creates unified 422 Problem Details for body validation failures", async () => {
    const bodySchema = z.object({ count: z.number().min(1) });
    const req = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 0 }),
    });

    const result = await validateBody(bodySchema, req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(422);
      const body = (await result.response.json()) as {
        type: string;
        title: string;
        code: string;
      };
      expect(body).toMatchObject({
        type: VALIDATION_PROBLEM_URI,
        title: "Request validation failed",
        code: "VALIDATION_FAILED",
      });
    }
  });

  test("distinguishes 400, 415, and 422 errors by status and stable code", async () => {
    const p400 = createMalformedJsonProblem();
    const p415 = createUnsupportedMediaTypeProblem();
    const p422 = createValidationProblem([], "query");

    expect(p400.status).toBe(400);
    const body400 = (await p400.json()) as { code: string; type: string };
    expect(body400.code).toBe("MALFORMED_JSON");
    expect(body400.type).toBe(MALFORMED_JSON_URI);

    expect(p415.status).toBe(415);
    const body415 = (await p415.json()) as { code: string; type: string };
    expect(body415.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(body415.type).toBe(UNSUPPORTED_MEDIA_TYPE_URI);

    expect(p422.status).toBe(422);
    const body422 = (await p422.json()) as { code: string; type: string; source: string };
    expect(body422.code).toBe("VALIDATION_FAILED");
    expect(body422.type).toBe(VALIDATION_PROBLEM_URI);
    expect(body422.source).toBe("query");
  });

  test("excludes internal engine stacks and raw payloads across all problem responses", async () => {
    const problemResponses = [
      createMalformedJsonProblem(),
      createUnsupportedMediaTypeProblem(),
      createValidationProblem([{ message: "Invalid field", path: ["secret"] }], "body"),
    ];

    for (const resp of problemResponses) {
      const body = await resp.json();
      const bodyStr = JSON.stringify(body);
      expect(bodyStr).not.toContain("SyntaxError");
      expect(bodyStr).not.toContain("node_modules");
      expect(bodyStr).not.toContain("at normalize");
    }
  });

  test("live request path serves consistent problem shapes (M6R1-009)", async () => {
    const { defineApp } = await import("../../src/core/app");
    const { route } = await import("../../src/core/route");
    const app = defineApp({
      routes: {
        "/v": {
          POST: route({ body: z.object({ id: z.string() }), handler: () => new Response("ok") }),
        },
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const base = server.url.origin;
      const r415 = await fetch(`${base}/v`, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
      const b415 = (await r415.json()) as Record<string, unknown>;
      const r400 = await fetch(`${base}/v`, { method: "POST", headers: { "content-type": "application/json" }, body: "{oops" });
      const b400 = (await r400.json()) as Record<string, unknown>;
      const r422 = await fetch(`${base}/v`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: 5 }) });
      const b422 = (await r422.json()) as Record<string, unknown>;

      // All three statuses share the documented member set on the real path.
      for (const [body, code] of [[b415, "UNSUPPORTED_MEDIA_TYPE"], [b400, "MALFORMED_JSON"], [b422, "VALIDATION_FAILED"]] as const) {
        expect(body.status).toBeNumber();
        expect(body.code).toBe(code);
        expect(body.type).toBeString();
        expect(body.title).toBeString();
      }
      expect(r415.status).toBe(415);
      expect(b415.status).toBe(415);
      expect(b415.source).toBe("body");
      expect(r400.status).toBe(400);
      expect(b400.status).toBe(400);
      expect(b400.source).toBe("body");
      expect(b422.source).toBe("body");
    } finally {
      server.stop(true);
    }
  });
});
