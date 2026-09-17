/**
 * telemetry example smoke (CA-25): request events with IDs, and the
 * redacted 500 — the crash detail must never reach the client.
 */
import { runSmoke, serveApp, check, jsonAt, matches } from "../smoke-helpers";
import { app } from "./app";

await runSmoke("telemetry", async () => {
  const { base, stop } = serveApp(app);
  try {
    matches(await jsonAt(await fetch(`${base}ping`), 200, "/ping"), { pong: true }, "/ping");
    const res = await fetch(`${base}ping`);
    check((res.headers.get("x-request-id") ?? "").length > 0, "x-request-id present");

    const crash = await fetch(`${base}crash`);
    check(crash.status === 500, `/crash status (got ${crash.status})`);
    const text = await crash.text();
    check(!text.includes("boom"), "redacted 500 does not leak the thrown message");
    check((crash.headers.get("content-type") ?? "").includes("application/problem+json"), "/crash problem type");
  } finally {
    stop();
  }
});
