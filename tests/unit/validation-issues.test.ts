import { describe, expect, test } from "bun:test";
import { normalizeValidationIssues } from "../../src/internal/validation-issues";
import { executeStandardSchema } from "../../src/internal/standard-schema";
import { zodUserSchema } from "../fixtures/validators/zod";
import { valibotUserSchema } from "../fixtures/validators/valibot";

describe("Validation issue normalization", () => {
  test("normalizes Zod failure issues into golden shape", () => {
    const zodResult = executeStandardSchema(zodUserSchema, { id: "not-a-number", name: "" });
    expect(zodResult).toHaveProperty("issues");
    const normalized = normalizeValidationIssues((zodResult as { issues: unknown[] }).issues);

    expect(normalized.length).toBe(2);
    expect(normalized[0]).toMatchObject({
      message: expect.stringContaining("Invalid input"),
      path: ["id"],
    });
    expect(normalized[1]).toMatchObject({
      message: expect.stringContaining("Too small"),
      path: ["name"],
    });
  });

  test("normalizes Valibot failure issues into golden shape", () => {
    const valibotResult = executeStandardSchema(valibotUserSchema, { id: "not-a-number", name: "" });
    expect(valibotResult).toHaveProperty("issues");
    const normalized = normalizeValidationIssues((valibotResult as { issues: unknown[] }).issues);

    expect(normalized.length).toBeGreaterThan(0);
    expect(normalized[0]).toHaveProperty("message");
    expect(normalized[0]).toHaveProperty("path");
  });

  test("normalizes Standard Schema PathSegment objects and primitive path elements", () => {
    const rawIssues = [
      {
        message: "Invalid field",
        path: ["user", { key: "address" }, { key: 0 }, { key: "zip" }],
      },
    ];
    const normalized = normalizeValidationIssues(rawIssues);
    expect(normalized).toEqual([
      {
        message: "Invalid field",
        path: ["user", "address", 0, "zip"],
      },
    ]);
  });

  test("caps issue count and appends deterministic truncation note", () => {
    const manyIssues = Array.from({ length: 60 }, (_, i) => ({
      message: `Issue ${i}`,
      path: [`field_${i}`],
    }));

    const normalized = normalizeValidationIssues(manyIssues, { maxIssues: 10 });
    expect(normalized.length).toBe(11);
    expect(normalized[10]?.message).toBe("[50 additional issues truncated]");
  });

  test("bounds message length and path depth", () => {
    const longMessage = "a".repeat(1000);
    const deepPath = Array.from({ length: 50 }, (_, i) => `seg_${i}`);
    const raw = [{ message: longMessage, path: deepPath }];

    const normalized = normalizeValidationIssues(raw, { maxMessageLength: 20, maxPathSegments: 5 });
    expect(normalized[0]?.message.length).toBe(20);
    expect(normalized[0]?.path?.length).toBe(5);
  });

  test("preserves safe primitive extension fields and filters unsafe fields", () => {
    const raw = [
      {
        message: "Bad format",
        path: ["email"],
        code: "invalid_string",
        expected: "email",
        received: "string",
        input: "secret-password-123",
        value: "secret-value",
        schema: { type: "object" },
        cause: new Error("internal parser failure"),
      },
    ];

    const normalized = normalizeValidationIssues(raw);
    expect(normalized[0]).toEqual({
      message: "Bad format",
      path: ["email"],
      code: "invalid_string",
      expected: "email",
      received: "string",
    });
    expect(normalized[0]).not.toHaveProperty("input");
    expect(normalized[0]).not.toHaveProperty("value");
    expect(normalized[0]).not.toHaveProperty("schema");
    expect(normalized[0]).not.toHaveProperty("cause");
  });

  test("handles empty and non-array issue inputs gracefully", () => {
    expect(normalizeValidationIssues([])).toEqual([]);
    expect(normalizeValidationIssues(undefined)).toEqual([]);
    expect(normalizeValidationIssues(null)).toEqual([]);
    expect(normalizeValidationIssues({ message: "Single issue" })).toEqual([
      { message: "Single issue" },
    ]);
  });
});
