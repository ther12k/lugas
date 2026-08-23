import { describe, expect, test } from "bun:test";
import { compileRoute } from "../../src/internal/compile-route";
import { route } from "../../src/core/route";
import { withErrorPolicy, defaultOnError } from "../../src/internal/error-policy";

describe("synchronous route fast path", () => {
  test("sync handler output is not a Promise and allocates no async wrapper", () => {
    const descriptor = route({ handler: () => new Response("sync") }) as never;
    const compiled = compileRoute("GET /s", descriptor, undefined);
    expect(compiled.isAsync).toBe(false);
    const out = compiled.handler(new Request("http://x/s"));
    expect(out instanceof Promise).toBe(false);
    expect(out).toBeInstanceOf(Response);
  });

  test("async handler still awaits through the async branch", async () => {
    const descriptor = route({ handler: async () => new Response("a") }) as never;
    const compiled = compileRoute("GET /a", descriptor, undefined);
    expect(compiled.isAsync).toBe(true);
    expect(compiled.handler(new Request("http://x/a"))).toBeInstanceOf(Promise);
  });

  test("sync thrown errors reach the error policy synchronously", () => {
    const descriptor = route({
      handler: () => { throw new Error("boom"); },
    }) as never;
    const compiled = compileRoute("GET /e", descriptor, undefined);
    const wrapped = withErrorPolicy(compiled.handler, defaultOnError, "GET /e");
    // M4R1-007 correction: the policy boundary is no longer force-async.
    // A sync handler's throw resolves through the default policy to a
    // redacted 500 Response — synchronously, with no Promise allocation.
    const outcome = wrapped(new Request("http://x/e"));
    expect(outcome).not.toBeInstanceOf(Promise);
    expect((outcome as Response).status).toBe(500);
  });

  test("sync fast path survives 1k sequential calls without promise allocation", () => {
    const descriptor = route({ handler: () => new Response("x") }) as never;
    const compiled = compileRoute("GET /k", descriptor, undefined);
    const request = new Request("http://x/k");
    let promises = 0;
    for (let i = 0; i < 1000; i++) {
      const out = compiled.handler(request);
      if (out instanceof Promise) promises++;
    }
    expect(promises).toBe(0);
  });
});
