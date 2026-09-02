import { describe, expect, test } from "bun:test";
import { diagnosticExists } from "../../src/internal/diagnostics";
import { empty, json, problem, text } from "../../src/core/response";

/**
 * Media-type ownership for typed response helpers (M6R8, #317).
 *
 * The typed client selects decoding from the response's actual media type,
 * so an incompatible explicit content-type override would make the brand
 * lie. Each helper therefore owns its media type and rejects contradictory
 * overrides while constructing the response. Compatible overrides keep the
 * documented precedence (caller wins).
 */
describe("typed-response media-type ownership", () => {
  test("json() accepts application/json, parameters, and +json subtypes", () => {
    for (const contentType of [
      "application/json",
      "application/json; charset=utf-16",
      "application/vnd.api+json",
      "application/problem+json",
    ]) {
      const res = json(200, { ok: true }, { headers: { "content-type": contentType } });
      expect(res.headers.get("content-type")).toBe(contentType);
    }
  });

  test("json() rejects non-JSON overrides as LUGAS_RESPONSE_001", () => {
    for (const contentType of ["text/plain", "text/json", "application/xml", ""]) {
      expect(() => json(200, { ok: true }, { headers: { "content-type": contentType } })).toThrow(
        expect.objectContaining({ code: "LUGAS_RESPONSE_001" }),
      );
    }
    expect(diagnosticExists("LUGAS_RESPONSE_001")).toBe(true);
  });

  test("text() accepts text/* subtypes and rejects others as LUGAS_RESPONSE_002", () => {
    for (const contentType of ["text/html", "text/plain; charset=utf-16", "text/csv"]) {
      const res = text(200, "x", { headers: { "content-type": contentType } });
      expect(res.headers.get("content-type")).toBe(contentType);
    }
    expect(() => text(200, "x", { headers: { "content-type": "application/json" } })).toThrow(
      expect.objectContaining({ code: "LUGAS_RESPONSE_002" }),
    );
  });

  test("problem() accepts only application/problem+json and rejects others as LUGAS_RESPONSE_003", () => {
    const res = problem(422, { title: "Nope" }, { headers: { "content-type": "application/problem+json" } });
    expect(res.headers.get("content-type")).toBe("application/problem+json");
    for (const contentType of ["application/json", "text/plain"]) {
      expect(() => problem(422, { title: "Nope" }, { headers: { "content-type": contentType } })).toThrow(
        expect.objectContaining({ code: "LUGAS_RESPONSE_003" }),
      );
    }
  });

  test("empty() rejects any content-type override as LUGAS_RESPONSE_004", () => {
    expect(() => empty(204, { headers: { "content-type": "application/json" } })).toThrow(
      expect.objectContaining({ code: "LUGAS_RESPONSE_004" }),
    );
    const res = empty(204);
    expect(res.headers.get("content-type")).toBeNull();
  });

  test("Headers instances and tuple forms are normalized before the check", () => {
    expect(() => json(200, { ok: true }, { headers: new Headers({ "content-type": "text/plain" }) })).toThrow(
      expect.objectContaining({ code: "LUGAS_RESPONSE_001" }),
    );
    expect(() => json(200, { ok: true }, { headers: [["content-type", "text/plain"]] })).toThrow(
      expect.objectContaining({ code: "LUGAS_RESPONSE_001" }),
    );
    // Case-insensitive header name; media type compared case-insensitively.
    const res = json(200, { ok: true }, { headers: new Headers({ "CONTENT-TYPE": "Application/JSON" }) });
    expect(res.headers.get("content-type")).toBe("Application/JSON");
  });
});
