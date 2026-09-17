/**
 * production example smoke (CA-25): lifecycle-aware health/readiness, the
 * post-init route, and the conservative security-header baseline on every
 * response (including the 404 fallback).
 */
import { runSmoke, serveApp, check, jsonAt, matches } from "../smoke-helpers";
import { app } from "./app";

function securityHeadersPresent(res: Response, label: string): void {
  for (const header of ["x-content-type-options", "x-frame-options", "referrer-policy"]) {
    check((res.headers.get(header) ?? "").length > 0, `${label}: ${header} present`);
  }
}

await runSmoke("production", async () => {
  const { base, stop } = serveApp(app);
  try {
    const health = await fetch(`${base}health`);
    matches(await jsonAt(health, 200, "/health"), { status: "ok" }, "/health");
    securityHeadersPresent(health, "/health");

    // Readiness flips once the service init settles; poll briefly.
    let ready: Response | null = null;
    for (let i = 0; i < 50; i++) {
      ready = await fetch(`${base}ready`);
      if (ready.status === 200) break;
      await Bun.sleep(100);
    }
    check(ready?.status === 200, `/ready eventual 200 (got ${String(ready?.status)})`);
    matches(await ready!.json(), { status: "ready" }, "/ready");

    matches(await jsonAt(await fetch(`${base}api/ping`), 200, "/api/ping"), { pong: true, db: true }, "/api/ping after init");

    const missing = await fetch(`${base}nope`);
    check(missing.status === 404, `unknown route status (got ${missing.status})`);
    securityHeadersPresent(missing, "404 fallback");
  } finally {
    stop();
  }
});
