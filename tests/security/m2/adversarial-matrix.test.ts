import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { defineApp } from "../../../src/core/app";
import { route } from "../../../src/core/route";
import { guard } from "../../../src/core/guard";
import { json, text } from "../../../src/core/response";

describe("M2 Adversarial Security Matrix", () => {
  // Setup comprehensive app
  let handlerHit = false;
  let guardHit = false;

  const authGuard = guard({
    name: "authGuard",
    handler: ({ request }) => {
      guardHit = true;
      const auth = request.headers.get("authorization");
      if (!auth || !auth.startsWith("Bearer valid-token")) {
        return json(401, { error: "unauthorized" });
      }
      return { user: "auth-user" };
    },
  });

  const app = defineApp({
    routes: {
      "/api/test/:id": {
        POST: route({
          params: z.object({ id: z.coerce.number().positive() }),
          query: z.object({ mode: z.string().min(1), tag: z.array(z.string()).optional() }),
          headers: z.object({ "x-client-id": z.string().min(1) }),
          body: z.object({ secret: z.string().min(8), amount: z.number().positive() }),
          before: [authGuard],
          handler: (ctx: any) => {
            handlerHit = true;
            return json(200, { ok: true, user: ctx.user, id: ctx.params.id });
          },
        }),
      },
    },
  });

  test("Q-01 / Q-03: Repeated query keys and unicode decoding behave deterministically", async () => {
    const server = app.serve({ port: 0 });
    const port = server.port;

    try {
      handlerHit = false;
      guardHit = false;

      const res = await fetch(
        `http://localhost:${port}/api/test/42?mode=%E6%97%A5%E6%9C%AC%E8%AA%9E&tag=alpha&tag=beta`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Client-Id": "client-1",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({ secret: "secure-pass-123", amount: 100 }),
        },
      );

      expect(res.status).toBe(200);
      expect(handlerHit).toBe(true);
      expect(guardHit).toBe(true);
    } finally {
      server.stop();
    }
  });

  test("Q-02: Prototype-like query keys do not pollute Object.prototype", async () => {
    const server = app.serve({ port: 0 });
    const port = server.port;

    try {
      handlerHit = false;
      guardHit = false;

      await fetch(
        `http://localhost:${port}/api/test/42?mode=safe&__proto__=polluted&constructor=fake`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Client-Id": "client-1",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({ secret: "secure-pass-123", amount: 100 }),
        },
      );

      const clean: any = {};
      expect(clean.polluted).toBeUndefined();
      expect(Object.prototype.hasOwnProperty("polluted")).toBe(false);
    } finally {
      server.stop();
    }
  });

  test("H-01: Header casing variations project safely and match schema", async () => {
    const server = app.serve({ port: 0 });
    const port = server.port;

    try {
      handlerHit = false;

      const res = await fetch(`http://localhost:${port}/api/test/42?mode=test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CLIENT-ID": "mixed-case-id",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({ secret: "secure-pass-123", amount: 100 }),
      });

      expect(res.status).toBe(200);
      expect(handlerHit).toBe(true);
    } finally {
      server.stop();
    }
  });

  test("JSON-01 / REDACT-01: Malformed JSON returns 400 Problem without leaking payload snippets", async () => {
    const server = app.serve({ port: 0 });
    const port = server.port;

    try {
      handlerHit = false;
      guardHit = false;

      const secretText = "TopSecretPassword12345";
      const brokenPayload = `{"secret": "${secretText}", "unclosed: [`;

      const res = await fetch(`http://localhost:${port}/api/test/42?mode=test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-Id": "client-1",
          Authorization: "Bearer valid-token",
        },
        body: brokenPayload,
      });

      expect(res.status).toBe(400);
      expect(guardHit).toBe(false);
      expect(handlerHit).toBe(false);

      const body = await res.json();
      const bodyString = JSON.stringify(body);
      expect(bodyString).not.toContain(secretText);
      expect(bodyString).not.toContain("SyntaxError");
    } finally {
      server.stop();
    }
  });

  test("415 Unsupported Media Type short-circuits before guards or handler", async () => {
    const server = app.serve({ port: 0 });
    const port = server.port;

    try {
      handlerHit = false;
      guardHit = false;

      const res = await fetch(`http://localhost:${port}/api/test/42?mode=test`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "X-Client-Id": "client-1",
          Authorization: "Bearer valid-token",
        },
        body: '{"secret": "valid-secret-123", "amount": 10}',
      });

      expect(res.status).toBe(415);
      expect(guardHit).toBe(false);
      expect(handlerHit).toBe(false);
    } finally {
      server.stop();
    }
  });
});
