/**
 * compression example smoke (CA-25): gzip negotiation with a strong ETag,
 * identity pass-through, and If-None-Match → 304 revalidation.
 */
import { runSmoke, serveApp, check } from "../smoke-helpers";
import { app } from "./app";

const PAYLOAD = "lugas compression example payload. ".repeat(100);

await runSmoke("compression", async () => {
  const { base, stop } = serveApp(app);
  try {
    const gz = await fetch(`${base}data`, { headers: { "accept-encoding": "gzip" } });
    check(gz.status === 200, "/data gzip status");
    check((gz.headers.get("content-encoding") ?? "").toLowerCase() === "gzip", "/data content-encoding gzip");
    check((gz.headers.get("vary") ?? "").toLowerCase().includes("accept-encoding"), "/data vary");
    const etag = gz.headers.get("etag");
    check(typeof etag === "string" && etag.length > 0, "/data strong etag present");
    const body = (await gz.json()) as { payload: string };
    check(body.payload === PAYLOAD, "/data payload round-trips through gzip");

    const revalidated = await fetch(`${base}data`, { headers: { "accept-encoding": "gzip", "if-none-match": etag! } });
    check(revalidated.status === 304, `If-None-Match status (got ${revalidated.status})`);
    check(revalidated.headers.get("etag") === etag, "304 keeps the validator");

    const identity = await fetch(`${base}data`, { headers: { "accept-encoding": "identity" } });
    check(identity.status === 200, "/data identity status");
    check((identity.headers.get("content-encoding") ?? "") === "", "identity has no content-encoding");
  } finally {
    stop();
  }
});
