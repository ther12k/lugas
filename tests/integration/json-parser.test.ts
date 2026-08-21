import { describe, expect, test } from "bun:test";
import {
  isJsonMediaType,
  parseJsonBody,
  UNSUPPORTED_MEDIA_TYPE_URI,
  MALFORMED_JSON_URI,
} from "../../src/internal/parse-json-body";

describe("JSON media-type & body parsing", () => {
  test("recognizes JSON-compatible media types and charset parameters", () => {
    expect(isJsonMediaType("application/json")).toBe(true);
    expect(isJsonMediaType("application/json; charset=utf-8")).toBe(true);
    expect(isJsonMediaType("application/problem+json")).toBe(true);
    expect(isJsonMediaType("application/vnd.api+json; charset=UTF-8")).toBe(true);
    expect(isJsonMediaType("APPLICATION/JSON")).toBe(true);

    expect(isJsonMediaType("text/plain")).toBe(false);
    expect(isJsonMediaType("application/xml")).toBe(false);
    expect(isJsonMediaType("application/x-www-form-urlencoded")).toBe(false);
    expect(isJsonMediaType("multipart/form-data; boundary=xyz")).toBe(false);
    expect(isJsonMediaType(null)).toBe(false);
    expect(isJsonMediaType("")).toBe(false);
  });

  test("parses valid JSON request body", async () => {
    const req = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Lugas", version: 1 }),
    });

    const result = await parseJsonBody(req);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ name: "Lugas", version: 1 });
    }
  });

  test("returns 415 Problem Details for unsupported or missing Content-Type", async () => {
    const noContentTypeReq = new Request("https://example.com/api", {
      method: "POST",
      body: '{"test": 1}',
    });

    const result1 = await parseJsonBody(noContentTypeReq);
    expect(result1.ok).toBe(false);
    if (!result1.ok) {
      expect(result1.response.status).toBe(415);
      const body = await result1.response.json();
      expect(body).toMatchObject({
        type: UNSUPPORTED_MEDIA_TYPE_URI,
        title: "Unsupported Media Type",
        code: "UNSUPPORTED_MEDIA_TYPE",
      });
    }

    const textReq = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: '{"test": 1}',
    });

    const result2 = await parseJsonBody(textReq);
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.response.status).toBe(415);
    }
  });

  test("returns 400 Problem Details for malformed JSON payloads", async () => {
    const malformedReq = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ unquoted_key: 123, invalid: [ }",
    });

    const result = await parseJsonBody(malformedReq);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect(result.response.headers.get("content-type")).toContain("application/problem+json");
      const body = await result.response.json();
      expect(body).toMatchObject({
        type: MALFORMED_JSON_URI,
        title: "Malformed JSON",
        code: "MALFORMED_JSON",
      });
    }
  });

  test("treats empty request body as undefined", async () => {
    const emptyReq = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "   ",
    });

    const result = await parseJsonBody(emptyReq);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });
});
