import { describe, expect, test } from "bun:test";
import { empty, problem, PROBLEM_CONTENT_TYPE, redirect, text } from "../../src/core/response";

describe("text helper", () => {
  test("sets plain text content type and body", async () => {
    const res = text(200, "hello");
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await res.text()).toBe("hello");
  });
  test("caller content-type override wins", () => {
    const res = text(200, "<b/>", { headers: { "content-type": "text/html" } });
    expect(res.headers.get("content-type")).toBe("text/html");
  });
});

describe("empty helper", () => {
  test("204 carries no body", async () => {
    const res = empty(204);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });
});

describe("problem helper", () => {
  test("serializes RFC 9457 members with problem content type", async () => {
    const res = problem(404, { title: "Not Found", code: "USER_MISSING" });
    expect(res.headers.get("content-type")).toBe(PROBLEM_CONTENT_TYPE);
    expect(await res.json()).toEqual({ title: "Not Found", code: "USER_MISSING" });
  });
  test("undefined members are dropped", async () => {
    const res = problem(400, { title: "x", detail: undefined });
    expect(await res.json()).toEqual({ title: "x" });
  });
});

describe("redirect helper", () => {
  test("defaults to 302 with location header", () => {
    const res = redirect("/login");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });
  test("accepts explicit redirect statuses", () => {
    for (const status of [301, 303, 307, 308] as const) {
      expect(redirect("/x", status).status).toBe(status);
    }
  });
  test("URL instances are serialized", () => {
    expect(redirect(new URL("https://example.test/a")).headers.get("location")).toBe("https://example.test/a");
  });
});
