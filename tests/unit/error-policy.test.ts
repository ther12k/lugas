import { describe, expect, test } from "bun:test";
import { defaultNotFound, defaultOnError, resolvePolicies } from "../../src/internal/error-policy";

describe("default not-found policy", () => {
  test("returns a 404 problem without secondary lookup", async () => {
    const res = defaultNotFound(new Request("http://x/missing"));
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("application/problem+json");
    expect(await res.json()).toEqual({ title: "Not Found" });
  });
});

describe("default unexpected-error policy", () => {
  test("normalizes unknown thrown values into redacted 500", async () => {
    const res = defaultOnError(new Error("secret token xyz"), new Request("http://x/a"));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { title: string };
    expect(body).toEqual({ title: "Internal Server Error" });
  });

  test("route identity is used when present, error value never serialized", async () => {
    const res = defaultOnError({ routeId: "GET /boom", secrets: "nope" }, new Request("http://x/boom"));
    const text = await res.text();
    expect(text).not.toContain("nope");
    expect(text).not.toContain("GET /boom");
  });
});

describe("app-provided policies", () => {
  test("custom policies are honored", async () => {
    const { notFound, onError } = resolvePolicies({
      notFound: () => new Response("gone", { status: 404 }),
      onError: () => new Response("oops", { status: 500 }),
    });
    expect((await notFound(new Request("http://x/"))).status).toBe(404);
    expect((await onError(new Error(), new Request("http://x/"))).status).toBe(500);
  });

  test("non-function policies are rejected at startup", () => {
    expect(() => resolvePolicies({ notFound: 42 as never })).toThrow(/notFound/);
    expect(() => resolvePolicies({ onError: "x" as never })).toThrow(/onError/);
  });
});
