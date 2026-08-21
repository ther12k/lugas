import { describe, expect, test } from "bun:test";
import { parseJsonBody } from "../../src/internal/parse-json-body";

describe("JSON parser security & redaction", () => {
  test("never includes raw malformed body fragments in 400 Problem Details", async () => {
    const rawSecretPayload = '{"password": "MySuperSecret123!", "key": [';
    const req = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: rawSecretPayload,
    });

    const result = await parseJsonBody(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      const bodyString = JSON.stringify(body);

      // Verify the secret payload is redacted and not included in the error
      expect(bodyString).not.toContain("MySuperSecret123!");
      expect(bodyString).not.toContain(rawSecretPayload);
    }
  });

  test("propagates aborted request signals without masking abort error", async () => {
    const controller = new AbortController();
    const req = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"valid": true}',
      signal: controller.signal,
    });

    controller.abort(new DOMException("The operation was aborted.", "AbortError"));
    await expect(parseJsonBody(req)).rejects.toThrow();
  });
});
