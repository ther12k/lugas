/**
 * rate-limit example smoke (CA-25): fixed-window 429s with Retry-After and
 * RateLimit-* headers — the strict shared login bucket first, then the
 * per-key API buckets (order matters: the login bucket counts all traffic).
 */
import { runSmoke, serveApp, check, jsonAt, matches } from "../smoke-helpers";
import { app } from "./app";

await runSmoke("rate-limit", async () => {
  const { base, stop } = serveApp(app);
  try {
    // Strict /login limiter: 5 allowed, 6th rejected — one shared bucket.
    for (let i = 1; i <= 5; i++) {
      const allowed = await fetch(`${base}login`, { method: "POST" });
      check(allowed.status === 200, `/login #${i} allowed`);
    }
    const limited = await fetch(`${base}login`, { method: "POST" });
    check(limited.status === 429, `/login 6th status (got ${limited.status})`);
    check((limited.headers.get("content-type") ?? "").includes("application/problem+json"), "/login 429 problem type");
    check(Number(limited.headers.get("retry-after")) > 0, "/login 429 Retry-After");
    check(limited.headers.get("ratelimit-limit") === "5", `/login RateLimit-Limit (got ${String(limited.headers.get("ratelimit-limit"))})`);
    check(limited.headers.get("ratelimit-remaining") === "0", `/login RateLimit-Remaining (got ${String(limited.headers.get("ratelimit-remaining"))})`);
    check(limited.headers.get("ratelimit-reset") !== null, "/login RateLimit-Reset present");

    // Per-key API limiter: independent buckets, visible quota.
    const first = await jsonAt(await fetch(`${base}api/data`, { headers: { "x-api-key": "alpha" } }), 200, "/api/data alpha");
    matches(first, { data: [1, 2, 3], remaining: 9 }, "/api/data alpha quota");

    const other = await jsonAt(await fetch(`${base}api/data`, { headers: { "x-api-key": "beta" } }), 200, "/api/data beta");
    matches(other, { data: [1, 2, 3], remaining: 9 }, "/api/data beta independent bucket");

    for (let i = 0; i < 9; i++) {
      const allowed = await fetch(`${base}api/data`, { headers: { "x-api-key": "alpha" } });
      check(allowed.status === 200, `/api/data alpha refill #${i + 2} allowed`);
    }
    const exhausted = await fetch(`${base}api/data`, { headers: { "x-api-key": "alpha" } });
    check(exhausted.status === 429, `/api/data alpha 11th status (got ${exhausted.status})`);
    check(exhausted.headers.get("ratelimit-remaining") === "0", "/api/data alpha remaining 0");
  } finally {
    stop();
  }
});
