/**
 * cookies example smoke (CA-25): set/read/expire a session cookie through
 * the guard — HttpOnly/SameSite/Max-Age attributes and the 401 path.
 */
import { runSmoke, serveApp, check, jsonAt, matches, firstCookie, attrContains } from "../smoke-helpers";
import { app } from "./app";

await runSmoke("cookies", async () => {
  const { base, stop } = serveApp(app);
  try {
    const login = await fetch(`${base}login`, { method: "POST" });
    matches(await jsonAt(login, 200, "POST /login"), { ok: true }, "POST /login");
    const cookie = firstCookie(login);
    check(cookie.name === "demo-session" && cookie.value === "secret-token", `login cookie pair (got ${cookie.name}=${cookie.value})`);
    attrContains(cookie, "HttpOnly", "login cookie");
    attrContains(cookie, "SameSite=Lax", "login cookie");
    attrContains(cookie, "Path=/", "login cookie");
    attrContains(cookie, "Max-Age=3600", "login cookie");

    const anon = await jsonAt(await fetch(`${base}me`), 401, "GET /me anonymous");
    matches(anon, { error: "no session" }, "GET /me 401");

    matches(
      await jsonAt(await fetch(`${base}me`, { headers: { cookie: `${cookie.name}=${cookie.value}` } }), 200, "GET /me"),
      { userId: "usr_demo" },
      "GET /me",
    );
    const bad = await fetch(`${base}me`, { headers: { cookie: "demo-session=wrong" } });
    check(bad.status === 401, `GET /me invalid cookie status (got ${bad.status})`);

    const logout = await fetch(`${base}logout`, { method: "POST" });
    matches(await jsonAt(logout, 200, "POST /logout"), { ok: true }, "POST /logout");
    const expired = firstCookie(logout);
    check(expired.name === "demo-session" && expired.value === "", "logout cookie cleared");
    attrContains(expired, "Max-Age=0", "logout cookie");
  } finally {
    stop();
  }
});
