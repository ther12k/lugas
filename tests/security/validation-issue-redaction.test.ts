import { describe, expect, test } from "bun:test";
import { normalizeValidationIssues } from "../../src/internal/validation-issues";

describe("Validation issue security & redaction", () => {
  test("never throws on hostile objects with throwing getters", () => {
    const hostile = [
      {
        get message(): string {
          throw new Error("malicious getter");
        },
        get path() {
          throw new Error("malicious path");
        },
        get schema() {
          throw new Error("malicious schema");
        },
      },
    ];

    expect(() => normalizeValidationIssues(hostile)).not.toThrow();
    const result = normalizeValidationIssues(hostile);
    expect(result.length).toBe(1);
    expect(result[0]?.message).toBe("Invalid input");
  });

  test("handles cyclic issue objects safely without infinite recursion", () => {
    const cyclicObj: Record<string, unknown> = {
      message: "cyclic issue",
    };
    cyclicObj.self = cyclicObj;

    expect(() => normalizeValidationIssues([cyclicObj, cyclicObj])).not.toThrow();
    const result = normalizeValidationIssues([cyclicObj, cyclicObj]);
    expect(result.length).toBe(2);
    expect(result[0]?.message).toBe("cyclic issue");
    expect(result[1]?.message).toBe("[Cyclic validation issue]");
  });

  test("never serializes raw user passwords, tokens, or request objects into issues", () => {
    const rawWithSecrets = [
      {
        message: "Password too weak",
        path: ["auth", "password"],
        input: "SuperSecretPassword123!",
        payload: { token: "bearer-token-value" },
        req: { headers: { authorization: "Bearer xyz" } },
        raw: "sensitive raw query",
      },
    ];

    const normalized = normalizeValidationIssues(rawWithSecrets);
    const json = JSON.stringify(normalized);

    expect(json).not.toContain("SuperSecretPassword123!");
    expect(json).not.toContain("bearer-token-value");
    expect(json).not.toContain("Bearer xyz");
    expect(json).not.toContain("sensitive raw query");
  });

  test("survives malformed non-object issue list items", () => {
    const malformed = [
      42,
      "plain string",
      null,
      undefined,
      true,
      Symbol("sym"),
      () => {},
    ];

    expect(() => normalizeValidationIssues(malformed)).not.toThrow();
    const result = normalizeValidationIssues(malformed);
    expect(result.length).toBe(malformed.length);
    for (const item of result) {
      expect(typeof item.message).toBe("string");
    }
  });
});
