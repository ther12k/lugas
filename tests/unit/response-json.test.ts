import { describe, expect, test } from "bun:test";
import { json } from "../../src/core/response";

describe("json helper", () => {
  test("returns a genuine native Response", () => {
    const res = json(200, { ok: true });
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
  });

  test("serializes body and applies default content-type", async () => {
    const res = json(201, { a: 1 });
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await res.json()).toEqual({ a: 1 });
  });

  test("init headers override default content-type deterministically", () => {
    const res = json(200, {}, { headers: { "content-type": "application/problem+json" } });
    expect(res.headers.get("content-type")).toBe("application/problem+json");
  });

  test("preserves status text and other init fields", () => {
    const res = json(418, { code: "TEAPOT" }, { statusText: "short and stout" });
    expect(res.statusText).toBe("short and stout");
  });

  test("clones retain status, headers, and body", async () => {
    const res = json(200, { list: [1, 2] });
    const clone = res.clone();
    expect(await res.json()).toEqual(await clone.json());
  });

  test("runtime object carries no enumerable brand debris", () => {
    const res = json(200, null);
    expect(Object.keys(res)).toHaveLength(Object.keys(new Response()).length);
  });
});
