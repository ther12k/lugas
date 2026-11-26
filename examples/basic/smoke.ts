/**
 * basic example smoke (CA-25): automates the README curl checks — typed
 * JSON, params, plain text, redirect, and Problem Details — against the
 * exported app on an ephemeral port.
 */
import { runSmoke, serveApp, check, jsonAt, matches } from "../smoke-helpers";
import { app } from "./app";

await runSmoke("basic", async () => {
  const { base, stop } = serveApp(app);
  try {
    const health = await fetch(`${base}health`);
    check(health.status === 200, "/health status");
    check((await health.text()) === "OK", "/health body 'OK'");

    matches(await jsonAt(await fetch(`${base}hello`), 200, "/hello"), { hello: "world" }, "/hello");

    matches(await jsonAt(await fetch(`${base}echo/42`), 200, "/echo/42"), { id: "42" }, "/echo/:id");

    const plain = await fetch(`${base}plain`);
    check(plain.status === 200, "/plain status");
    check((await plain.text()) === "plain text", "/plain body");
    check((plain.headers.get("content-type") ?? "").includes("text/plain"), "/plain content-type");

    const login = await fetch(`${base}login`, { redirect: "manual" });
    check(login.status === 302, `/login status (got ${login.status})`);
    check(login.headers.get("location") === "/health", "/login location");

    matches(await jsonAt(await fetch(`${base}missing-example`), 404, "/missing-example"), { title: "Not found" }, "/missing-example");

    // Framework default 404 (the README's /does-not-exist check): Problem Details.
    const unknown = await fetch(`${base}does-not-exist`);
    check(unknown.status === 404, `/does-not-exist status (got ${unknown.status})`);
    check((unknown.headers.get("content-type") ?? "").includes("application/problem+json"), "/does-not-exist problem content-type");
    const unknownBody = (await unknown.json()) as { title?: string };
    check(typeof unknownBody.title === "string", "/does-not-exist problem title");
  } finally {
    stop();
  }
});
