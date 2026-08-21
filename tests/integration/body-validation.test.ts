import { describe, expect, test } from "bun:test";
import { z } from "zod";
import * as v from "valibot";
import { validateBody } from "../../src/internal/validate-body";
import { VALIDATION_PROBLEM_TYPE } from "../../src/internal/validate-params";

describe("JSON body validation & transformation", () => {
  const zodUserBody = z.object({
    username: z.string().min(3),
    age: z.number().int().min(0),
    tags: z.array(z.string()).default([]),
  });

  const valibotUserBody = v.object({
    username: v.pipe(v.string(), v.minLength(3)),
    age: v.pipe(v.number(), v.integer(), v.minValue(0)),
    tags: v.optional(v.array(v.string()), []),
  });

  test("validates and transforms valid JSON body via Zod", async () => {
    const req = new Request("https://example.com/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice", age: 25 }),
    });

    const result = await validateBody(zodUserBody, req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        username: "alice",
        age: 25,
        tags: [],
      });
    }
  });

  test("validates and transforms valid JSON body via Valibot", async () => {
    const req = new Request("https://example.com/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bob_dev", age: 30, tags: ["admin"] }),
    });

    const result = await validateBody(valibotUserBody, req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        username: "bob_dev",
        age: 30,
        tags: ["admin"],
      });
    }
  });

  test("returns 415 Problem Details for unsupported content-type without invoking schema", async () => {
    const req = new Request("https://example.com/api/users", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ username: "alice", age: 25 }),
    });

    const result = await validateBody(zodUserBody, req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(415);
    }
  });

  test("returns 400 Problem Details for malformed JSON syntax", async () => {
    const req = new Request("https://example.com/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{ username: "broken", age: }',
    });

    const result = await validateBody(zodUserBody, req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  test("returns 422 Problem Details when body fails schema validation", async () => {
    const req = new Request("https://example.com/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "a", age: -5 }),
    });

    const result = await validateBody(zodUserBody, req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(422);
      expect(result.response.headers.get("content-type")).toContain("application/problem+json");
      const body = (await result.response.json()) as {
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

  test("handles empty body according to schema optionality", async () => {
    const optionalBodySchema = z.object({ msg: z.string() }).optional();

    const emptyReq = new Request("https://example.com/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    });

    const result = await validateBody(optionalBodySchema, emptyReq);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });

  test("skips body reading entirely when no body schema is declared", async () => {
    const req = new Request("https://example.com/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "raw unparsed stream",
    });

    const result = await validateBody(undefined, req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
      // Verify body stream was not consumed by validateBody
      expect(req.bodyUsed).toBe(false);
    }
  });

  test("supports async body transformation schemas", async () => {
    const asyncBodySchema = zodUserBody.transform(async (data) => ({
      ...data,
      slug: data.username.toLowerCase(),
    }));

    const req = new Request("https://example.com/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "GraceHopper", age: 85 }),
    });

    const result = await validateBody(asyncBodySchema, req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        username: "GraceHopper",
        age: 85,
        tags: [],
        slug: "gracehopper",
      });
    }
  });
});
