/**
 * validation example smoke (CA-25): Standard Schema coercion across query
 * params, headers, and body — plus the documented 422/415/400 failure
 * paths — against the exported app.
 */
import { runSmoke, serveApp, check, jsonAt, matches } from "../smoke-helpers";
import { app } from "./app";

await runSmoke("validation", async () => {
  const { base, stop } = serveApp(app);
  try {
    matches(
      await jsonAt(await fetch(`${base}search?q=lugas&page=2`), 200, "/search"),
      { query: { q: "lugas", page: 2 } },
      "/search (page coerced to number)",
    );

    const badQuery = await fetch(`${base}search?page=abc`);
    check(badQuery.status === 422, `/search invalid page status (got ${badQuery.status})`);
    check((badQuery.headers.get("content-type") ?? "").includes("application/problem+json"), "/search invalid problem type");

    const users = await fetch(`${base}users/42`, { headers: { "x-api-version": "v1" } });
    matches(await jsonAt(users, 200, "/users/:id"), { id: 42, version: "v1" }, "/users/:id header input");

    const created = await fetch(`${base}users/42`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
    });
    matches(await jsonAt(created, 201, "POST /users/:id"), { id: 42, user: { name: "Alice", email: "alice@example.com" } }, "POST /users/:id");

    const noType = await fetch(`${base}users/42`, { method: "POST", body: "{}" });
    check(noType.status === 415, `missing content-type status (got ${noType.status})`);

    const badJson = await fetch(`${base}users/42`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    check(badJson.status === 400, `malformed JSON status (got ${badJson.status})`);
  } finally {
    stop();
  }
});
