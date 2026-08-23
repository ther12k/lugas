/**
 * Sync error boundary and redaction hardening (M4R1-007, issue #201).
 *
 * Probes: fully-sync descriptors keep a non-async final handler; frozen
 * errors still produce the redacted 500 with the original value untouched;
 * promise rejections take the async path; custom onError sees the thrown
 * value unmodified.
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { compileRoute } from "../../src/internal/compile-route";
import { withErrorPolicy, defaultOnError } from "../../src/internal/error-policy";

const req = (path = "/x") => new Request(`https://example.com${path}`);

describe("Error boundary semantics (M4R1-007)", () => {
  test("fully-sync descriptor produces a non-async final Bun handler", () => {
    const descriptor = route({ handler: () => new Response("sync") }) as never;
    const compiled = compileRoute("GET /sync", descriptor, undefined);
    const wrapped = withErrorPolicy(compiled.handler, defaultOnError, "GET /sync");
    expect(wrapped.constructor.name).toBe("Function");
    const out = wrapped(req());
    expect(out instanceof Promise).toBe(false);
    expect((out as Response).status).toBe(200);
  });

  test("frozen thrown Error still yields the redacted 500; value untouched", async () => {
    const frozen = Object.freeze(new Error("secret-value"));
    let observed: unknown;
    const app = defineApp({
      routes: {
        "/boom": route({
          handler: () => {
            observed = undefined;
            throw frozen;
          },
        }),
      },
    });
    // Route identity reaches the default policy via closure: assert through
    // the wrapper directly.
    const descriptor = route({ handler: () => { throw frozen; } }) as never;
    const compiled = compileRoute("GET /frozen", descriptor, undefined);
    const wrapped = withErrorPolicy(compiled.handler, defaultOnError, "GET /frozen");
    const res = (await wrapped(req("/frozen"))) as Response;
    void app;
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("Internal Server Error");
    expect(res.headers.get("content-type")).toContain("problem+json");
    // The thrown value was never mutated.
    expect("routeId" in frozen).toBe(false);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(observed).toBeUndefined();
  });

  test("rejected Promise from a sync-declared handler hits the policy", async () => {
    const descriptor = route({
      handler: (): Promise<Response> => Promise.reject(new Error("async-boom")),
    }) as never;
    const compiled = compileRoute("GET /reject", descriptor, undefined);
    const wrapped = withErrorPolicy(compiled.handler, defaultOnError, "GET /reject");
    const res = (await wrapped(req("/reject"))) as Response;
    expect(res.status).toBe(500);
  });

  test("custom onError receives the thrown value unmodified", async () => {
    const secret = Object.freeze(new Error("custom"));
    let seen: unknown;
    const custom = (error: unknown): Response => {
      seen = error;
      return new Response("handled", { status: 503 });
    };
    const descriptor = route({ handler: () => { throw secret; } }) as never;
    const compiled = compileRoute("GET /custom", descriptor, undefined);
    const wrapped = withErrorPolicy(compiled.handler, custom, "GET /custom");
    const res = (await wrapped(req("/custom"))) as Response;
    expect(res.status).toBe(503);
    expect(seen).toBe(secret);
  });

  test("live server: frozen-error route serves the redacted problem body", async () => {
    const app = defineApp({
      routes: {
        "/frozen": route({
          handler: () => {
            throw Object.freeze(new Error("nope"));
          },
        }),
      },
    });
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(`${server.url}frozen`);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ title: "Internal Server Error" });
    } finally {
      server.stop(true);
    }
  });
});
