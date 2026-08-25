/**
 * CRUD proof API integration tests (M5-016).
 *
 * Exercises list/create/read/update/delete, validation, auth/role guards,
 * error statuses, and 204 — all through the public API against a live server.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { proofApp } from "../../examples/proof-api/app";

describe("CRUD proof API", () => {
  const server = proofApp.serve({ port: 0, development: false });
  const base = server.url.origin;

  test("POST /users creates a user (201)", async () => {
    const res = await fetch(new URL("/users", base), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer t" },
      body: JSON.stringify({ name: "Ada", email: "ada@example.com" }),
    });
    expect(res.status).toBe(201);
    const user = await res.json();
    expect(user.name).toBe("Ada");
    expect(user.id).toBeGreaterThan(0);
  });

  test("GET /users lists created users", async () => {
    const res = await fetch(new URL("/users", base));
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test("GET /users/:id returns a specific user", async () => {
    // Create first
    await fetch(new URL("/users", base), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer t" },
      body: JSON.stringify({ name: "Bob", email: "bob@example.com" }),
    });
    const res = await fetch(new URL("/users/1", base));
    expect(res.status).toBe(200);
    const user = await res.json();
    expect(user.id).toBe(1);
  });

  test("PATCH /users/:id updates a user", async () => {
    const res = await fetch(new URL("/users/1", base), {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: "Bearer t" },
      body: JSON.stringify({ name: "Ada Updated" }),
    });
    expect(res.status).toBe(200);
    const user = await res.json();
    expect(user.name).toBe("Ada Updated");
  });

  test("404 for nonexistent user on GET", async () => {
    const res = await fetch(new URL("/users/9999", base));
    expect(res.status).toBe(404);
  });

  test("401 without auth header on POST", async () => {
    const res = await fetch(new URL("/users", base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "NoAuth", email: "noauth@example.com" }),
    });
    expect(res.status).toBe(401);
  });

  test("DELETE requires admin role (403 without)", async () => {
    const res = await fetch(new URL("/users/1", base), {
      method: "DELETE",
      headers: { authorization: "Bearer t" }, // no x-role
    });
    expect(res.status).toBe(403);
  });

  test("DELETE with admin role returns 204", async () => {
    const res = await fetch(new URL("/users/1", base), {
      method: "DELETE",
      headers: { authorization: "Bearer t", "x-role": "admin" },
    });
    expect(res.status).toBe(204);
  });

  test("PUT /conflict returns 409", async () => {
    const res = await fetch(new URL("/conflict", base), { method: "PUT" });
    expect(res.status).toBe(409);
  });

  test("validation failure produces 422", async () => {
    const res = await fetch(new URL("/users", base), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer t" },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    expect([400, 422]).toContain(res.status);
  });

  afterAll(() => { server.stop(true); });
});
