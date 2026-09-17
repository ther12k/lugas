/**
 * proof-api example smoke (CA-25): the production-shaped CRUD surface —
 * guarded create/update/delete, not-found and conflict paths — against the
 * exported app.
 */
import { runSmoke, serveApp, check, jsonAt, matches } from "../smoke-helpers";
import { proofApp } from "./app";

const AUTH = { authorization: "Bearer demo" };
const ADMIN = { authorization: "Bearer demo", "x-role": "admin" };
const jsonHeaders = { "content-type": "application/json" };

await runSmoke("proof-api", async () => {
  const { base, stop } = serveApp(proofApp);
  try {
    const empty = await jsonAt(await fetch(`${base}users`), 200, "GET /users empty");
    check(Array.isArray(empty) && empty.length === 0, "GET /users starts empty");

    const unauthorized = await jsonAt(
      await fetch(`${base}users`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "A", email: "a@x.io" }) }),
      401,
      "POST /users anonymous",
    );
    matches(unauthorized, { code: "UNAUTHORIZED" }, "POST /users 401");

    const created = await jsonAt(
      await fetch(`${base}users`, { method: "POST", headers: { ...jsonHeaders, ...AUTH }, body: JSON.stringify({ name: "Ada", email: "ada@example.com" }) }),
      201,
      "POST /users",
    );
    matches(created, { id: 1, name: "Ada", email: "ada@example.com" }, "POST /users 201");

    const invalid = await fetch(`${base}users`, { method: "POST", headers: { ...jsonHeaders, ...AUTH }, body: JSON.stringify({ name: "", email: "nope" }) });
    check(invalid.status === 422, `POST /users invalid body status (got ${invalid.status})`);

    matches(await jsonAt(await fetch(`${base}users/1`), 200, "GET /users/1"), { id: 1, name: "Ada" }, "GET /users/:id");
    matches(await jsonAt(await fetch(`${base}users/999`), 404, "GET /users/999"), { code: "USER_NOT_FOUND" }, "GET /users/:id 404");

    const patched = await jsonAt(
      await fetch(`${base}users/1`, { method: "PATCH", headers: { ...jsonHeaders, ...AUTH }, body: JSON.stringify({ name: "Ada L." }) }),
      200,
      "PATCH /users/1",
    );
    matches(patched, { id: 1, name: "Ada L.", email: "ada@example.com" }, "PATCH keeps unspecified fields");

    const conflict = await jsonAt(await fetch(`${base}conflict`, { method: "PUT" }), 409, "PUT /conflict");
    matches(conflict, { code: "CONFLICT" }, "PUT /conflict 409");

    check((await fetch(`${base}users/1`, { method: "DELETE" })).status === 401, "DELETE anonymous 401");
    check(
      (await fetch(`${base}users/1`, { method: "DELETE", headers: AUTH })).status === 403,
      "DELETE non-admin 403",
    );
    const deleted = await fetch(`${base}users/1`, { method: "DELETE", headers: ADMIN });
    check(deleted.status === 204, `DELETE admin status (got ${deleted.status})`);
    check((await deleted.text()) === "", "DELETE admin 204 empty body");
    check((await fetch(`${base}users/1`, { method: "DELETE", headers: ADMIN })).status === 404, "DELETE unknown 404");

    const slow = await jsonAt(await fetch(`${base}slow`), 200, "GET /slow");
    matches(slow, { late: true }, "GET /slow");
  } finally {
    stop();
  }
});
