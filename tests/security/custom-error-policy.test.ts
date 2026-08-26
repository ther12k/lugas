/**
 * Custom error-policy fallback tests (M6R1-008).
 *
 * A custom onError policy that throws, rejects, or returns a non-Response
 * must never leak the original error (or the policy's own failure) to Bun's
 * development error page. The second-line fallback is the redacted default
 * 500 problem.
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";

function makeApp(onError: unknown) {
  return defineApp({
    onError: onError as never,
    routes: {
      "/boom": {
        GET: route({
          handler: () => {
            throw new Error("SECRET-INTERNAL-DETAIL");
          },
        }),
      },
    },
  });
}

async function expectRedacted500(app: ReturnType<typeof defineApp>): Promise<void> {
  const server = app.serve({ port: 0, development: false });
  try {
    const res = await fetch(`${server.url.origin}/boom`);
    expect(res.status).toBe(500);
    const text = await res.text();
    // Neither the route's thrown message nor a stack may leak.
    expect(text).not.toContain("SECRET-INTERNAL-DETAIL");
    expect(text).not.toContain("at ");
    expect(res.headers.get("content-type")).toContain("application/problem+json");
  } finally {
    server.stop(true);
  }
}

describe("custom error-policy fallback (M6R1-008)", () => {
  test("policy that throws → redacted default 500", async () => {
    await expectRedacted500(
      makeApp(() => {
        throw new Error("POLICY-EXPLODED");
      }),
    );
  });

  test("policy that rejects → redacted default 500", async () => {
    await expectRedacted500(makeApp(() => Promise.reject(new Error("POLICY-REJECTED"))));
  });

  test("policy returning non-Response → redacted default 500", async () => {
    await expectRedacted500(
      makeApp(() => ({ title: "not-a-response" }) as unknown as Response),
    );
  });

  test("async policy returning non-Response → redacted default 500", async () => {
    await expectRedacted500(
      makeApp(async () => "nope" as unknown as Response),
    );
  });

  test("a healthy custom policy still controls the response", async () => {
    const app = makeApp((_error: unknown, _request: Request) => new Response("custom-handled", { status: 503 }));
    const server = app.serve({ port: 0, development: false });
    try {
      const res = await fetch(`${server.url.origin}/boom`);
      expect(res.status).toBe(503);
      expect(await res.text()).toBe("custom-handled");
    } finally {
      server.stop(true);
    }
  });
});
