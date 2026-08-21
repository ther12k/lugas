import { describe, expect, test } from "bun:test";
import { z } from "zod";
import * as v from "valibot";
import { projectHeaders, validateHeaders } from "../../src/internal/validate-headers";
import { VALIDATION_PROBLEM_TYPE } from "../../src/internal/validate-params";

describe("Header projection & validation", () => {
  const zodHeaderSchema = z.object({
    "x-api-version": z.string().min(1),
    "x-client-id": z.coerce.number().int().positive(),
  });

  const valibotHeaderSchema = v.object({
    "x-api-version": v.pipe(v.string(), v.minLength(1)),
    "x-client-id": v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1)),
  });

  test("projects mixed-case header names into lower-case keys", () => {
    const headers = new Headers({
      "X-Api-Version": "v2",
      "X-Client-Id": "1001",
      "User-Agent": "Bun/1.4.0",
    });

    const projected = projectHeaders(headers);
    expect(projected["x-api-version"]).toBe("v2");
    expect(projected["x-client-id"]).toBe("1001");
    expect(projected["user-agent"]).toBe("Bun/1.4.0");
  });

  test("validates and transforms headers via Zod schema", () => {
    const headers = new Headers({
      "X-API-VERSION": "v1",
      "X-CLIENT-ID": "42",
    });

    const result = validateHeaders(zodHeaderSchema, headers);
    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(true);
    if (syncResult.ok) {
      expect(syncResult.data).toEqual({
        "x-api-version": "v1",
        "x-client-id": 42,
      });
      expect(typeof syncResult.data["x-client-id"]).toBe("number");
    }
  });

  test("validates and transforms headers via Valibot schema", () => {
    const headers = new Headers({
      "X-Api-Version": "v3",
      "X-Client-Id": "99",
    });

    const result = validateHeaders(valibotHeaderSchema, headers);
    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(true);
    if (syncResult.ok) {
      expect(syncResult.data).toEqual({
        "x-api-version": "v3",
        "x-client-id": 99,
      });
    }
  });

  test("preserves native Request headers unchanged", () => {
    const req = new Request("https://example.com/", {
      headers: {
        "X-Custom-Header": "original-value",
      },
    });

    validateHeaders(zodHeaderSchema, req);
    expect(req.headers.get("x-custom-header")).toBe("original-value");
    expect(req.headers.has("X-Custom-Header")).toBe(true);
  });

  test("returns 422 Problem Details when header validation fails", async () => {
    const headers = new Headers({
      "x-api-version": "",
      "x-client-id": "not-a-number",
    });

    const result = validateHeaders(zodHeaderSchema, headers);
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
        type: VALIDATION_PROBLEM_TYPE,
        title: "Request validation failed",
        code: "VALIDATION_FAILED",
      });
      expect(Array.isArray(body.issues)).toBe(true);
    }
  });

  test("skips projection and returns data undefined when no header schema is declared", () => {
    const headers = new Headers({ "x-random": "value" });
    const result = validateHeaders(undefined, headers);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });
});
