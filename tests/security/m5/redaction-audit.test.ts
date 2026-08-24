/**
 * Full redaction audit (M5-008).
 */
import { describe, expect, test } from "bun:test";
import { ClientPathError } from "../../../src/client/path";
import { ClientQueryError } from "../../../src/client/query";
import { ClientRequestError } from "../../../src/client/request";
import { ClientDecodeError } from "../../../src/client/errors";
import { formatDiagnostic } from "../../../src/internal/diagnostics";

const SECRET = "SUPER_SECRET_VALUE_DO_NOT_LEAK";

describe("redaction audit: all diagnostic paths", () => {
  test("path errors never contain secret values", () => {
    const err = new ClientPathError("LUGAS_CLIENT_001", "missing path param");
    expect(err.message).not.toContain(SECRET);
  });

  test("query errors never contain secret values", () => {
    const err = new ClientQueryError("invalid query value");
    expect(err.message).not.toContain(SECRET);
  });

  test("request errors never contain header values", () => {
    const err = new ClientRequestError("LUGAS_CLIENT_009", "header authorization contains forbidden characters");
    expect(err.message).toContain('authorization');
    expect(err.message).not.toContain("Bearer");
  });

  test("decode errors never contain body content", () => {
    const response = new Response('{"token":"' + SECRET + '"}', { status: 200 });
    const err = new ClientDecodeError(response);
    expect(err.message).not.toContain(SECRET);
  });

  test("formatDiagnostic output is always safe for logging", () => {
    for (const sample of [
      new ClientPathError("LUGAS_CLIENT_001", "missing param"),
      new ClientQueryError("invalid query"),
      new ClientRequestError("LUGAS_CLIENT_007", "platform options may not own method"),
    ]) {
      const human = formatDiagnostic(sample as never);
      const json = formatDiagnostic(sample as never, "json");
      expect(human).not.toContain(SECRET);
      expect(json).not.toContain(SECRET);
      expect(json).not.toContain("at ");
      expect(json).not.toContain(".ts:");
    }
  });
});
