import { describe, expect, test } from "bun:test";
import { z } from "zod";
import * as v from "valibot";
import { validateQuery } from "../../src/internal/validate-query";
import { VALIDATION_PROBLEM_TYPE } from "../../src/internal/validate-params";

describe("Query validation & transformation", () => {
  const zodSearchQuery = z.object({
    q: z.string().min(1),
    page: z.coerce.number().int().positive().default(1),
    tag: z.array(z.string()).optional(),
  });

  const valibotSearchQuery = v.object({
    q: v.pipe(v.string(), v.minLength(1)),
    page: v.optional(v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1)), "1"),
    tag: v.optional(v.array(v.string())),
  });

  test("validates and coerces single and array query params via Zod", () => {
    const req = new Request("https://example.com/search?q=lugas&page=3&tag=fast&tag=bun");
    const result = validateQuery(zodSearchQuery, req);

    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(true);
    if (syncResult.ok) {
      expect(syncResult.data).toEqual({
        q: "lugas",
        page: 3,
        tag: ["fast", "bun"],
      });
      expect(typeof syncResult.data.page).toBe("number");
    }
  });

  test("validates and coerces query params via Valibot", () => {
    const req = new Request("https://example.com/search?q=framework&page=2");
    const result = validateQuery(valibotSearchQuery, req);

    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(true);
    if (syncResult.ok) {
      expect(syncResult.data).toEqual({
        q: "framework",
        page: 2,
      });
      expect(typeof syncResult.data.page).toBe("number");
    }
  });

  test("returns 422 Problem Details when query validation fails", async () => {
    const req = new Request("https://example.com/search?q=&page=not-a-number");
    const result = validateQuery(zodSearchQuery, req);

    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(false);
    if (!syncResult.ok) {
      expect(syncResult.response.status).toBe(422);
      expect(syncResult.response.headers.get("content-type")).toContain("application/problem+json");
      const body = (await syncResult.response.json() as any) as {
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
      expect(body.issues.length).toBeGreaterThan(0);
    }
  });

  test("skips query validation and returns data undefined when no query schema is declared", () => {
    const req = new Request("https://example.com/search?q=anything");
    const result = validateQuery(undefined, req);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });

  test("supports async query validation schemas", async () => {
    const asyncQuerySchema = zodSearchQuery.transform(async (val) => ({
      ...val,
      normalizedTerm: val.q.trim().toLowerCase(),
    }));

    const req = new Request("https://example.com/search?q=LUGAS-TEST");
    const resultPromise = validateQuery(asyncQuerySchema, req);

    expect(resultPromise).toBeInstanceOf(Promise);
    const result = await resultPromise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        q: "LUGAS-TEST",
        page: 1,
        normalizedTerm: "lugas-test",
      });
    }
  });
});
