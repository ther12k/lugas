import { describe, expect, test } from "bun:test";
import { createClient, joinUrl, normalizeBaseUrl } from "../../src/client/create-client";
import type { LugasClient } from "../../src/client/create-client";

describe("createClient() base configuration", () => {
  test("normalizes trailing slash without losing origin or base path", () => {
    expect(normalizeBaseUrl("https://api.example.com")).toEqual({
      origin: "https://api.example.com",
      basePath: "",
    });
    expect(normalizeBaseUrl("https://api.example.com/")).toEqual({
      origin: "https://api.example.com",
      basePath: "",
    });
    expect(normalizeBaseUrl("https://api.example.com/v1///")).toEqual({
      origin: "https://api.example.com",
      basePath: "/v1",
    });
    expect(normalizeBaseUrl(new URL("https://api.example.com/v1/"))).toEqual({
      origin: "https://api.example.com",
      basePath: "/v1",
    });
  });

  test("joins base path with request paths", () => {
    const base = normalizeBaseUrl("https://api.example.com/v1");
    expect(joinUrl(base, "/users")).toBe("https://api.example.com/v1/users");
    expect(joinUrl(base, "users")).toBe("https://api.example.com/v1/users");
    expect(joinUrl(normalizeBaseUrl("https://api.example.com"), "/users")).toBe(
      "https://api.example.com/users",
    );
  });

  test("rejects invalid base URLs with a clear diagnostic", () => {
    expect(() => createClient({ baseUrl: "not a url" })).toThrow("invalid baseUrl");
    expect(() => createClient({ baseUrl: "ftp://example.com" })).toThrow("http(s)");
  });

  test("rejects non-object config", () => {
    expect(() => createClient(null as never)).toThrow("config must be an object");
  });

  test("rejects baseUrl carrying query or hash instead of dropping them silently", () => {
    expect(() => createClient({ baseUrl: "https://x.test/v1?token=abc" })).toThrow(
      "must not include a query or hash",
    );
    expect(() => createClient({ baseUrl: "https://x.test/v1#frag" })).toThrow(
      "must not include a query or hash",
    );
    expect(() => createClient({ baseUrl: new URL("https://x.test/v1?key=1") })).toThrow(
      "must not include a query or hash",
    );
  });

  test("injected fetch is preserved; default resolves to global fetch", () => {
    const injected: typeof fetch = (async (_input: string | URL | Request, _init?: RequestInit) =>
      new Response("stub")) as unknown as typeof fetch;
    const withInjected = createClient({ baseUrl: "https://x.test", fetch: injected });
    expect(withInjected.fetch).toBe(injected);

    const withDefault = createClient({ baseUrl: "https://x.test" });
    expect(typeof withDefault.fetch).toBe("function");
  });

  test("returned client object is frozen", () => {
    const client = createClient({ baseUrl: "https://x.test" });
    expect(Object.isFrozen(client)).toBe(true);
  });

  test("application type parameter is erased at runtime", () => {
    type API = { readonly "/users": { readonly GET: unknown } };
    const typed: LugasClient<API> = createClient<API>({ baseUrl: "https://x.test" });
    expect(typed.baseUrl).toEqual({ origin: "https://x.test", basePath: "" });
    expect(Object.keys(typed).sort()).toEqual([
      "baseUrl",
      "delete",
      "fetch",
      "get",
      "head",
      "options",
      "patch",
      "post",
      "put",
      "request",
    ]);
  });

  test("module has no Bun-specific or Proxy usage at runtime surface", async () => {
    const source = await Bun.file("src/client/create-client.ts").text();
    expect(source).not.toContain("Bun.");
    expect(source).not.toContain("new Proxy");
  });
});
