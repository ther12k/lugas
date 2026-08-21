import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json, text } from "../../src/core/response";

describe("Request body limits & oversize payload security", () => {
  test("enforces Bun maxRequestBodySize on server instance and fails closed", async () => {
    const app = defineApp({
      routes: {
        "/upload": {
          POST: route({
            body: z.object({ data: z.string() }),
            handler: (ctx: any) => json(200, { received: ctx.body.data.length }),
          }),
        },
      },
    });

    // Configure small maximum body size (e.g. 64 bytes)
    const server = app.serve({ port: 0, maxRequestBodySize: 64 });
    const port = server.port;

    try {
      // 1. Small payload succeeds
      const smallRes = await fetch(`http://localhost:${port}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: "short" }),
      });
      expect(smallRes.status).toBe(200);

      // 2. Oversize payload (> 64 bytes) is rejected by Bun / Lugas
      const largePayload = JSON.stringify({ data: "x".repeat(500) });
      const largeRes = await fetch(`http://localhost:${port}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: largePayload,
      });

      // Status should be 413 Payload Too Large or 400/500 problem details
      expect([400, 413, 500]).toContain(largeRes.status);
      const textBody = await largeRes.text();

      // Ensure the raw large payload fragment is not leaked in the error body
      expect(textBody).not.toContain("x".repeat(100));
    } finally {
      server.stop();
    }
  });

  test("never reflects raw malformed payload fragments in problem details on large requests", async () => {
    const app = defineApp({
      routes: {
        "/validate": {
          POST: route({
            body: z.object({ key: z.string() }),
            handler: () => text(200, "ok"),
          }),
        },
      },
    });

    const server = app.serve({ port: 0 });
    const port = server.port;

    try {
      const secretFragment = "super_secret_unclosed_string_payload_12345678";
      const brokenPayload = `{"key": "${secretFragment}`;

      const res = await fetch(`http://localhost:${port}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: brokenPayload,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      const bodyStr = JSON.stringify(body);

      // Verify the sensitive unclosed fragment was NOT reflected back
      expect(bodyStr).not.toContain(secretFragment);
    } finally {
      server.stop();
    }
  });
});
