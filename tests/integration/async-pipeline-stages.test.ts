/**
 * Regression tests for M6R1-003: async pipeline completed-stage tracking.
 *
 * Two defects were present in executeAsyncPipeline():
 *  1. A fresh empty Set was created per call, so stages already completed by
 *     the synchronous caller were re-executed in the async continuation.
 *  2. `partialContext.params ?? rawParams` replaced a legitimate nullish
 *     transformed value with unvalidated raw params.
 *
 * These tests confirm the defective behaviour is absent and the fix holds.
 */
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { route } from "../../src/core/route";
import { defineApp } from "../../src/core/app";
import { json } from "../../src/core/response";

// ---------------------------------------------------------------------------
// Defect 1: async schema invoked twice for one request.
// The headers schema below is synchronous; the params schema is made async by
// returning a Promise from ~parse~. When headers resolve sync and params yield
// a Promise, executeAsyncPipeline() is entered. Without the fix the headers
// schema would be called again inside the async continuation.
// ---------------------------------------------------------------------------
describe("async pipeline completed-stage tracking (M6R1-003)", () => {
  test("an async schema is called exactly once per request when a prior stage resolved synchronously", async () => {
    const paramsCalls: string[] = [];

    // A deliberately async params schema so the sync path escalates to async.
    const asyncParamsSchema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value: unknown): Promise<{ value: Record<string, string> }> => {
          paramsCalls.push("params");
          return Promise.resolve({ value: value as Record<string, string> });
        },
      },
    };

    const headerCalls: string[] = [];
    const headersSchema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value: unknown): { value: Record<string, string> } => {
          headerCalls.push("headers");
          return { value: value as Record<string, string> };
        },
      },
    };

    const app = defineApp({
      routes: {
        "/check": {
          GET: route({
            params: asyncParamsSchema as never,
            headers: headersSchema as never,
            handler: () => json(200, { ok: true }),
          }),
        },
      },
    });

    const server = app.serve({ port: 0 });
    try {
      const res = await fetch(`http://localhost:${server.port}/check`, {
        headers: { "x-test": "1" },
      });
      expect(res.status).toBe(200);
    } finally {
      server.stop(true);
    }

    // Each schema must be invoked exactly once.
    expect(headerCalls).toEqual(["headers"]);
    expect(paramsCalls).toEqual(["params"]);
  });

  // ---------------------------------------------------------------------------
  // Defect 2: a validator returning undefined/null loses its output.
  // When a params validator legitimately outputs undefined, the old
  // `partialContext.params ?? rawParams` replaced it with the raw string map.
  // The handler must receive the validated (null/undefined) output, not rawParams.
  // ---------------------------------------------------------------------------
  test("a validator returning undefined preserves undefined — does not fall back to raw params", async () => {
    let receivedParams: unknown = "NOT SET";

    // An async params schema that always transforms to undefined (e.g. strips all).
    const nullifySchema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (_value: unknown): Promise<{ value: undefined }> => {
          return Promise.resolve({ value: undefined });
        },
      },
    };

    const app = defineApp({
      routes: {
        "/strip": {
          GET: route({
            params: nullifySchema as never,
            handler: (ctx) => {
              receivedParams = ctx.params;
              return json(200, { ok: true });
            },
          }),
        },
      },
    });

    const server = app.serve({ port: 0 });
    try {
      await fetch(`http://localhost:${server.port}/strip`);
    } finally {
      server.stop(true);
    }

    // Handler must receive undefined, not the raw string-map from the URL.
    expect(receivedParams).toBeUndefined();
  });
});
