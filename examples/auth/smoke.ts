/**
 * auth example smoke (CA-25): ordered guards — public access, 401 without
 * a token, context enrichment for a member, and the 403 admin
 * short-circuit — against the exported app.
 */
import { runSmoke, serveApp, check, jsonAt, matches } from "../smoke-helpers";
import { app } from "./app";

const MEMBER = { authorization: "Bearer member-token" };
const ADMIN = { authorization: "Bearer admin-token" };

await runSmoke("auth", async () => {
  const { base, stop } = serveApp(app);
  try {
    matches(
      await jsonAt(await fetch(`${base}public`), 200, "/public"),
      { message: "Publicly accessible" },
      "/public",
    );

    const anon = await jsonAt(await fetch(`${base}profile`), 401, "/profile anonymous");
    matches(anon, { error: "Missing or invalid Bearer token" }, "/profile 401");

    matches(
      await jsonAt(await fetch(`${base}profile`, { headers: MEMBER }), 200, "/profile member"),
      { user: { id: "user_2", role: "member" } },
      "/profile member",
    );

    const forbidden = await jsonAt(
      await fetch(`${base}admin/dashboard`, { headers: MEMBER }),
      403,
      "/admin/dashboard member",
    );
    matches(forbidden, { error: "Admin role required" }, "/admin/dashboard 403");

    const granted = await jsonAt(await fetch(`${base}admin/dashboard`, { headers: ADMIN }), 200, "/admin/dashboard admin");
    matches(
      granted,
      { message: "Welcome Admin", user: { id: "user_1", role: "admin" }, adminVerified: true },
      "/admin/dashboard admin",
    );
    check(granted.adminVerified === true, "admin guard ordering (enrichment before handler)");
  } finally {
    stop();
  }
});
