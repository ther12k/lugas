import { describe, expect, test } from "bun:test";
import { executeStandardSchema, isStandardSchema, StandardSchemaError } from "../../src/internal/standard-schema";
import { valibotUserSchema } from "../fixtures/validators/valibot";
import { zodAsyncUserSchema, zodUserSchema } from "../fixtures/validators/zod";

describe("Standard Schema executor", () => {
  test("accepts independent Zod and Valibot schemas and preserves transformed output", () => {
    const zodResult = executeStandardSchema(zodUserSchema, { id: "7", name: "Ada" });
    const valibotResult = executeStandardSchema(valibotUserSchema, { id: "8", name: "Grace" });

    expect(zodResult).toEqual({ value: { id: 7, name: "Ada" } });
    expect(valibotResult).toMatchObject({ value: { id: 8, name: "Grace" } });
  });

  test("supports asynchronous validation without changing the output contract", async () => {
    const result = executeStandardSchema(zodAsyncUserSchema, { id: "9", name: "Lin" });
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toEqual({ value: { id: 9, name: "Lin", label: "9:Lin" } });
  });

  test("returns standard failure issues without discarding validator fields", () => {
    const result = executeStandardSchema(zodUserSchema, { id: "nope", name: "" });
    expect(result).toHaveProperty("issues");
    const issues = (result as { issues: Array<{ message: string }> }).issues;
    expect(issues.length).toBe(2);
    expect(issues[0]?.message).toContain("expected number");
  });

  test("keeps synchronous validation on the non-Promise path", () => {
    const result = executeStandardSchema(valibotUserSchema, { id: "2", name: "Bun" });
    expect(result).not.toBeInstanceOf(Promise);
  });

  test("rejects schemas that do not expose the v1 structural contract", () => {
    expect(() => executeStandardSchema({} as never, "value")).toThrowError(
      expect.objectContaining({ code: "STANDARD_SCHEMA_INVALID" }),
    );
    expect(() => executeStandardSchema({ "~standard": { version: 2, vendor: "x", validate: () => ({ value: 1 }) } } as never, "value"))
      .toThrowError(/version.*1/);
  });

  test("rejects malformed validator results", () => {
    const invalid = { "~standard": { version: 1 as const, vendor: "fixture", validate: () => ({ nope: true }) } };
    expect(() => executeStandardSchema(invalid as never, "value")).toThrowError(
      expect.objectContaining({ code: "STANDARD_SCHEMA_RESULT_INVALID" }),
    );

    const nonArrayIssues = { "~standard": { version: 1 as const, vendor: "fixture", validate: () => ({ issues: "bad-issues" }) } };
    expect(() => executeStandardSchema(nonArrayIssues as never, "value")).toThrowError(/issues/);
  });

  test("normalizes rejected asynchronous result promises as executor errors", async () => {
    const invalid = {
      "~standard": {
        version: 1 as const,
        vendor: "fixture",
        validate: async () => ({ issues: [{ message: "bad", path: ["field"] }] }),
      },
    };
    await expect(executeStandardSchema(invalid, "value")).resolves.toEqual({
      issues: [{ message: "bad", path: ["field"] }],
    });
  });

  test("recognizes callable schema objects and rejects primitive lookalikes", () => {
    const callable = Object.assign(() => undefined, {
      "~standard": { version: 1 as const, vendor: "fixture", validate: () => ({ value: true }) },
    });
    expect(isStandardSchema(callable)).toBe(true);
    expect(isStandardSchema(null)).toBe(false);
    expect(isStandardSchema({ "~standard": { version: 1, vendor: "fixture", validate: 1 } })).toBe(false);
  });

  test("exposes a stable typed error", () => {
    try {
      executeStandardSchema({ "~standard": { version: 1, vendor: "fixture", validate: () => 1 } } as never, "value");
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toBeInstanceOf(StandardSchemaError);
      expect((error as StandardSchemaError).code).toBe("STANDARD_SCHEMA_RESULT_INVALID");
    }
  });
});
