import { describe, expect, test } from "bun:test";
import { z } from "zod";
import * as v from "valibot";
import { validateParams, VALIDATION_PROBLEM_TYPE } from "../../src/internal/validate-params";

describe("Params validation & transformation", () => {
  const zodParams = z.object({
    id: z.coerce.number().int().positive(),
    slug: z.string().min(2),
  });

  const valibotParams = v.object({
    id: v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1)),
    slug: v.pipe(v.string(), v.minLength(2)),
  });

  test("transforms string params into typed numbers via Zod schema", () => {
    const raw = { id: "123", slug: "bun-native" };
    const result = validateParams(zodParams, raw);

    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(true);
    if (syncResult.ok) {
      expect(syncResult.data).toEqual({ id: 123, slug: "bun-native" });
      expect(typeof syncResult.data.id).toBe("number");
    }
  });

  test("transforms string params into typed numbers via Valibot schema", () => {
    const raw = { id: "456", slug: "lugas-core" };
    const result = validateParams(valibotParams, raw);

    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(true);
    if (syncResult.ok) {
      expect(syncResult.data).toEqual({ id: 456, slug: "lugas-core" });
      expect(typeof syncResult.data.id).toBe("number");
    }
  });

  test("returns 422 Problem Details on validation failure", async () => {
    const raw = { id: "invalid-id", slug: "a" };
    const result = validateParams(zodParams, raw);

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
      expect(body.issues.length).toBeGreaterThan(0);
    }
  });

  test("passes raw string params through with zero validation when no schema is provided", () => {
    const raw = { id: "raw-string-id", anyParam: "anything" };
    const result = validateParams(undefined, raw);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(raw);
    }
  });

  test("supports async param validation and transforms", async () => {
    const asyncSchema = zodParams.transform(async (val) => ({
      ...val,
      lookupKey: `${val.id}:${val.slug.toUpperCase()}`,
    }));

    const raw = { id: "99", slug: "async-test" };
    const resultPromise = validateParams(asyncSchema, raw);

    expect(resultPromise).toBeInstanceOf(Promise);
    const result = await resultPromise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        id: 99,
        slug: "async-test",
        lookupKey: "99:ASYNC-TEST",
      });
    }
  });

  test("handles unicode and encoded parameter values safely", () => {
    const unicodeSchema = z.object({
      tag: z.string().min(1),
    });

    const raw = { tag: "日本語-tag" };
    const result = validateParams(unicodeSchema, raw);

    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(true);
    if (syncResult.ok) {
      expect(syncResult.data.tag).toBe("日本語-tag");
    }
  });
});
