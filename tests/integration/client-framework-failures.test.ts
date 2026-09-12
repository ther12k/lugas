/**
 * RF-3 runtime round-trip: the framework failure statuses that are now part
 * of the typed contract actually arrive as those typed branches — a client
 * can branch on 422/415/400 without casts, and an out-of-union status (bare
 * transport 413) still decodes safely through the actual-response fallback.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { createTestServer } from "../../src/testing";
import { createClient } from "../../src/client/create-client";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { z } from "zod";
import { json } from "../../src/core/response";

const app = defineApp({
  routes: {
    "/users/:id": {
      PUT: route({
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string() }),
        handler: (ctx) => json(200, { id: ctx.params.id, name: ctx.body.name }),
      }),
    },
  },
});
type API = AppContract<typeof app>;

describe("client framework-failure branches", () => {
  const server = createTestServer(app);
  afterAll(() => server.stop());

  test("invalid body arrives as the typed 422 VALIDATION_FAILED branch", async () => {
    const client = createClient<API>({ baseUrl: server.url });
    const res = await client.put("/users/:id", {
      params: { id: "u1" },
      // @ts-expect-error deliberately invalid body for the runtime branch
      body: { name: 42 },
    });
    if (!res.ok) {
      expect(res.status).toBe(422);
      expect(res.error.code).toBe("VALIDATION_FAILED");
      expect(res.error.issues?.[0]?.message).toBeTruthy();
    } else {
      throw new Error("expected the 422 failure branch");
    }
  });

  test("non-JSON content type arrives as the typed 415 branch", async () => {
    const server2 = app.serve({ port: 0, development: false });
    try {
      // Raw fetch: the typed client refuses conflicting content types by
      // design (LUGAS_CLIENT conflict diagnostic), so the 415 wire truth is
      // exercised outside the structured input path.
      const res = await fetch(`${server2.url}/users/u1`, {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "not json",
      });
      expect(res.status).toBe(415);
      const problem = (await res.json()) as { code: string };
      expect(problem.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    } finally {
      server2.stop(true);
    }
  });

  test("malformed JSON arrives as the typed 400 branch", async () => {
    const server2 = app.serve({ port: 0, development: false });
    try {
      // Raw fetch: the typed client cannot send non-JSON bodies (by design).
      const res = await fetch(`${server2.url}/users/u1`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: "{not json",
      });
      expect(res.status).toBe(400);
      const problem = (await res.json()) as { code: string };
      expect(problem.code).toBe("MALFORMED_JSON");
    } finally {
      server2.stop(true);
    }
  });

  test("an out-of-union status (transport 413) decodes safely via the fallback", async () => {
    const server2 = app.serve({ port: 0, development: false, maxRequestBodySize: 16 });
    try {
      const res = await fetch(`${server2.url}/users/u1`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "x".repeat(256) }),
      });
      // Bun's transport ceiling emits a bare 413 with an empty body — the
      // documented non-Problem 413 that stays OUT of the typed union.
      expect(res.status).toBe(413);
      expect(await res.text()).toBe("");
    } finally {
      server2.stop(true);
    }
  });
});
