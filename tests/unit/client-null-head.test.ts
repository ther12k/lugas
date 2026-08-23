/**
 * Typed-client required-input and HTTP edge probes (M4R1-006, issue #200).
 *
 * Runtime half: `body: null` transmits literal JSON null, and HEAD responses
 * carrying a JSON content-type with no body never raise decode errors.
 * Compile-time negative cases live in tests/types/client-required-input.test-d.ts.
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";
import type { AppContract } from "../../src/core/contract";
import { createClient, type LugasClient } from "../../src/client/create-client";

const app = defineApp({
  routes: {
    "/echo-null": {
      POST: route({
        body: z.null(),
        handler: ({ body }: any) => json(200, { received: body, isNull: body === null }),
      }),
    },
    "/head-json": {
      HEAD: route({ handler: () => json(200, { ok: true }) }),
    },
  },
});

type Contract = AppContract<typeof app>;

describe("Typed client HTTP edges (M4R1-006)", () => {
  test("body: null sends literal JSON null to the server", async () => {
    const server = app.serve({ port: 0, development: false });
    const client: LugasClient<Contract> = createClient<Contract>({ baseUrl: server.url });
    try {
      const result = await client.post("/echo-null", { body: null });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = result.data as { received: unknown; isNull: boolean };
        expect(data.isNull).toBe(true);
        expect(data.received).toBeNull();
      }
    } finally {
      server.stop(true);
    }
  });

  test("HEAD response with JSON content-type and empty body does not throw", async () => {
    const server = app.serve({ port: 0, development: false });
    const client = createClient<Contract>({ baseUrl: server.url });
    try {
      const result = await client.head("/head-json");
      expect(result.status).toBe(200);
      expect(result.ok).toBe(true);
      // Bodiless by HTTP semantics; parser must yield undefined, not decode-error.
      if (result.ok) expect(result.data).toBeUndefined();
    } finally {
      server.stop(true);
    }
  });

  test("omitted body still means no request body at runtime", async () => {
    let sawBody = "unset";
    const probeApp = defineApp({
      routes: {
        "/probe": {
          POST: route({
            handler: ({ body }: any) => {
              sawBody = JSON.stringify(body ?? null);
              return json(204, null);
            },
          }),
        },
      },
    });
    const server = probeApp.serve({ port: 0, development: false });
    type ProbeContract = AppContract<typeof probeApp>;
    const client = createClient<ProbeContract>({ baseUrl: server.url });
    try {
      await client.post("/probe");
      expect(sawBody).toBe("null");
    } finally {
      server.stop(true);
    }
  });
});
