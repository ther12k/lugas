/**
 * realworld example smoke (CA-25): end-to-end automation of the README
 * walkthrough — seeded list, cookie login, guarded mutations, duplicate and
 * not-found problems, avatar upload, SSE first events, WebSocket presence,
 * OpenAPI, and logout expiry — against the exported app.
 */
import { runSmoke, serveApp, check, jsonAt, matches, firstCookie, attrContains } from "../smoke-helpers";
import { app } from "./app";

const jsonHeaders = { "content-type": "application/json" };

async function readSseEvents(res: Response, count: number): Promise<Array<{ event?: string | undefined; data: unknown }>> {
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: Array<{ event?: string | undefined; data: unknown }> = [];
  const absorb = (block: string) => {
    const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
    if (dataLine === undefined) return;
    const eventLine = block.split("\n").find((l) => l.startsWith("event:"));
    let data: unknown = dataLine.slice(5).trim();
    try {
      data = JSON.parse(data as string);
    } catch { /* plain-text frame */ }
    events.push({ event: eventLine?.slice(6).trim(), data });
  };
  while (events.length < count) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) >= 0 && events.length < count) {
      absorb(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
    }
  }
  await reader.cancel();
  return events;
}

function nextWsMessage(socket: WebSocket, label: string, timeoutMs = 5_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`check failed: ${label} timed out`)), timeoutMs);
    socket.addEventListener("message", (e) => { clearTimeout(timer); resolve(String(e.data)); }, { once: true });
  });
}

function wsOpen(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", () => reject(new Error("check failed: ws open")), { once: true });
  });
}

async function login(base: string, name: string): Promise<{ cookie: string; token: string }> {
  const res = await fetch(`${base}auth/login`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name }) });
  await jsonAt(res, 200, `login ${name}`);
  const c = firstCookie(res);
  return { cookie: `${c.name}=${c.value}`, token: c.value };
}

await runSmoke("realworld", async () => {
  const { base, stop } = serveApp(app);
  try {
    // --- public surface (README curl order) ---
    matches(await jsonAt(await fetch(`${base}health`), 200, "/health"), { status: "ok" }, "/health");
    matches(await jsonAt(await fetch(`${base}ready`), 200, "/ready"), { status: "ready" }, "/ready");
    const seeded = await jsonAt(await fetch(`${base}users`), 200, "/users");
    matches(seeded, { users: [{ id: 1, name: "ada", email: "ada@example.com" }], page: 1 }, "/users seeded");

    const openapi = await fetch(`${base}openapi.json`);
    check(openapi.status === 200, `/openapi.json status (got ${openapi.status})`);
    const doc = (await openapi.json()) as { openapi?: string; paths?: object };
    check(typeof doc.openapi === "string" && typeof doc.paths === "object", "/openapi.json document shape");
    const docs = await fetch(`${base}docs`);
    check(docs.status === 200 && (docs.headers.get("content-type") ?? "").includes("text/html"), "/docs Scalar UI");

    // --- session ---
    const ada = await login(base, "ada");
    const unknown = await fetch(`${base}auth/login`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "nobody" }) });
    check(unknown.status === 404, `/auth/login unknown status (got ${unknown.status})`);
    matches(await unknown.json(), { title: "Unknown user", detail: "No user named nobody" }, "/auth/login 404 problem");

    const anonMe = await jsonAt(await fetch(`${base}me`), 401, "/me anonymous");
    matches(anonMe, { error: "not signed in (cookie)" }, "/me 401");
    const me = await jsonAt(await fetch(`${base}me`, { headers: { cookie: ada.cookie } }), 200, "/me");
    matches(me, { user: { id: 1, name: "ada", token: ada.token } }, "/me session");
    const badMe = await jsonAt(await fetch(`${base}me`, { headers: { cookie: "session=wrong" } }), 401, "/me bad cookie");
    matches(badMe, { error: "unknown session" }, "/me 401 unknown session");

    // --- mutations ---
    const created = await jsonAt(
      await fetch(`${base}users`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "grace", email: "grace@example.com" }) }),
      201,
      "POST /users",
    );
    matches(created, { id: 2, name: "grace", email: "grace@example.com" }, "POST /users 201");

    const duplicate = await fetch(`${base}users`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "grace2", email: "grace@example.com" }) });
    check(duplicate.status === 409, `duplicate email status (got ${duplicate.status})`);
    matches(await duplicate.json(), { title: "Email already registered", detail: "grace@example.com" }, "duplicate 409 problem");

    const invalid = await fetch(`${base}users`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "x", email: "nope" }) });
    check(invalid.status === 422, `invalid body status (got ${invalid.status})`);

    matches(await jsonAt(await fetch(`${base}users/2`), 200, "GET /users/2"), { id: 2, name: "grace" }, "GET /users/:id");
    const missing = await fetch(`${base}users/99999`);
    check(missing.status === 404, `missing user status (got ${missing.status})`);
    matches(await missing.json(), { title: "User not found", detail: "id 99999" }, "missing 404 problem");

    check((await fetch(`${base}users/2`, { method: "PATCH", headers: { ...jsonHeaders }, body: JSON.stringify({ name: "renamed" }) })).status === 401, "PATCH unguarded 401");
    const patched = await jsonAt(
      await fetch(`${base}users/2`, { method: "PATCH", headers: { ...jsonHeaders, cookie: ada.cookie }, body: JSON.stringify({ name: "renamed" }) }),
      200,
      "PATCH /users/2",
    );
    matches(patched, { id: 2, name: "renamed" }, "PATCH 200");
    check(
      (await fetch(`${base}users/99999`, { method: "PATCH", headers: { ...jsonHeaders, cookie: ada.cookie }, body: JSON.stringify({ name: "zz" }) })).status === 404,
      "PATCH missing id 404 (CA-25 fix)",
    );

    // avatar upload + missing-part 422
    const avatarForm = new FormData();
    avatarForm.append("avatar", new Blob([new Uint8Array(64)], { type: "image/png" }), "avatar.png");
    const avatar = await jsonAt(
      await fetch(`${base}users/2/avatar`, { method: "POST", headers: { cookie: ada.cookie }, body: avatarForm }),
      201,
      "POST avatar",
    );
    matches(avatar, { id: 2, avatar: { name: "avatar.png", type: "image/png", size: 64 } }, "avatar 201");
    const noPart = await fetch(`${base}users/2/avatar`, { method: "POST", headers: { cookie: ada.cookie }, body: new FormData() });
    check(noPart.status === 422, `avatar missing part status (got ${noPart.status})`);
    matches(await noPart.json(), { title: "Missing file part" }, "avatar 422 problem");

    // --- SSE: connected event, then a live user.created bus event ---
    const eventsRes = await fetch(`${base}events`, { headers: { cookie: ada.cookie } });
    check(eventsRes.status === 200, `/events status (got ${eventsRes.status})`);
    check((eventsRes.headers.get("content-type") ?? "").includes("text/event-stream"), "/events content-type");
    const eventsPromise = readSseEvents(eventsRes, 2);
    await fetch(`${base}users`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "linus", email: "linus@example.com" }) });
    const events = await eventsPromise;
    matches(events[0] ?? {}, { event: "connected", data: { user: "ada" } }, "SSE connected event");
    matches(events[1] ?? {}, { event: "user.created", data: { id: 3, name: "linus" } }, "SSE live user.created event");

    // --- WebSocket presence (two sessions; publish excludes sender) ---
    const ada2 = await login(base, "ada");
    const wsA = await wsOpen(base.replace(/^http/, "ws") + `ws?session=${ada.token}`);
    const joinPromise = nextWsMessage(wsA, "ws join frame");
    const wsB = await wsOpen(base.replace(/^http/, "ws") + `ws?session=${ada2.token}`);
    const join = await joinPromise;
    check(join === JSON.stringify({ join: "ada" }), `ws join frame (got ${join})`);

    const helloPromise = nextWsMessage(wsB, "ws echo frame");
    wsA.send("hello");
    const echoed = await helloPromise;
    check(echoed === "ada: hello", `ws broadcast frame (got ${echoed})`);

    const leavePromise = nextWsMessage(wsA, "ws leave frame");
    wsB.close(1000);
    const leave = await leavePromise;
    check(leave === JSON.stringify({ leave: "ada" }), `ws leave frame (got ${leave})`);
    wsA.close(1000);

    // --- guarded delete + logout expiry ---
    check((await fetch(`${base}users/3`, { method: "DELETE" })).status === 401, "DELETE unguarded 401");
    const deleted = await jsonAt(
      await fetch(`${base}users/3`, { method: "DELETE", headers: { cookie: ada.cookie } }),
      200,
      "DELETE /users/3",
    );
    matches(deleted, { deleted: 3 }, "DELETE 200");
    check(
      (await fetch(`${base}users/3`, { method: "DELETE", headers: { cookie: ada.cookie } })).status === 404,
      "DELETE missing id 404 (CA-25 fix)",
    );
    check((await fetch(`${base}users/3`)).status === 404, "deleted user gone");

    const logout = await fetch(`${base}auth/logout`, { method: "POST", headers: { cookie: ada.cookie } });
    matches(await jsonAt(logout, 200, "/auth/logout"), { ok: true }, "/auth/logout");
    const expired = firstCookie(logout);
    check(expired.name === "session" && expired.value === "", "logout cookie cleared");
    attrContains(expired, "Max-Age=0", "logout cookie");
  } finally {
    stop();
  }
});
