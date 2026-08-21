import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { validateHeaders, projectHeaders } from "../../src/internal/validate-headers";

describe("Header security & sensitive redaction", () => {
  const authHeaderSchema = z.object({
    authorization: z.string().regex(/^Bearer [A-Za-z0-9_-]{32}$/, "Invalid bearer token"),
    cookie: z.string().regex(/^session=[a-z0-9]+$/, "Invalid cookie"),
  });

  test("redacts sensitive header values in validation problem issues", async () => {
    const rawSecretToken = "Bearer secret-malformed-token-123456789";
    const rawSecretCookie = "session=evil-bad-cookie-payload";

    const headers = new Headers({
      authorization: rawSecretToken,
      cookie: rawSecretCookie,
    });

    const result = validateHeaders(authHeaderSchema, headers);
    expect(result).not.toBeInstanceOf(Promise);
    const syncResult = result as Exclude<typeof result, Promise<unknown>>;
    expect(syncResult.ok).toBe(false);

    if (!syncResult.ok) {
      const body = await syncResult.response.json();
      const bodyJson = JSON.stringify(body);

      // Verify the sensitive secrets are completely absent from the problem response
      expect(bodyJson).not.toContain(rawSecretToken);
      expect(bodyJson).not.toContain("secret-malformed-token");
      expect(bodyJson).not.toContain(rawSecretCookie);
      expect(bodyJson).not.toContain("evil-bad-cookie-payload");
    }
  });

  test("projects headers into a safe null-prototype object", () => {
    const headers = new Headers();
    headers.set("Host", "localhost");

    const projected = projectHeaders(headers);
    expect(Object.getPrototypeOf(projected)).toBeNull();
  });
});
