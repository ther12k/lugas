import { describe, expect, test } from "bun:test";
import { decodeQuery } from "../../../src/internal/decode-query";
import { parseJsonBody } from "../../../src/internal/parse-json-body";
import { normalizeValidationIssues } from "../../../src/internal/validation-issues";

/** Simple deterministic pseudo-random generator for reproducible fuzz testing. */
function createPrng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("Bounded property & adversarial fuzz tests (Seed: 424242)", () => {
  const rand = createPrng(424242);

  test("fuzzes query decoder with 200 random search strings", () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&=%_-\u3053\u3093\u0000+!~*'";

    for (let i = 0; i < 200; i++) {
      let queryStr = "?";
      const len = Math.floor(rand() * 50) + 1;
      for (let j = 0; j < len; j++) {
        queryStr += chars[Math.floor(rand() * chars.length)];
      }

      expect(() => {
        const decoded = decodeQuery(queryStr);
        expect(Object.getPrototypeOf(decoded)).toBeNull();
      }).not.toThrow();
    }
  });

  test("fuzzes JSON parser with 200 malformed JSON mutations", async () => {
    const tokens = ['{"', '"}', ":", ",", "[", "]", "true", "false", "null", "123", '"str"', '""', "\\u0000", "undefined", "{"];

    for (let i = 0; i < 200; i++) {
      let payload = "";
      const count = Math.floor(rand() * 15) + 1;
      for (let j = 0; j < count; j++) {
        payload += tokens[Math.floor(rand() * tokens.length)];
      }

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      const res = await parseJsonBody(req);
      if (!res.ok) {
        expect(res.response.status).toBe(400);
      }
    }
  });

  test("fuzzes issue normalizer with random hostile object topologies", () => {
    for (let i = 0; i < 100; i++) {
      const hostile: any = {};
      if (rand() > 0.5) hostile.self = hostile;
      if (rand() > 0.5) {
        Object.defineProperty(hostile, "message", {
          get() {
            if (rand() > 0.5) throw new Error("hostile getter panic");
            return "sometimes works";
          },
        });
      }
      if (rand() > 0.5) hostile.path = Array.from({ length: 30 }, (_, k) => ({ key: `k_${k}` }));

      expect(() => {
        const normalized = normalizeValidationIssues([hostile, null, 123, hostile]);
        expect(Array.isArray(normalized)).toBe(true);
      }).not.toThrow();
    }
  });
});
