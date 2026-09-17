/**
 * static example smoke (CA-25): explicit asset mappings, the directory
 * mount, native 404s, and the API fallback — against the exported app.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runSmoke, serveApp, check, jsonAt, matches } from "../smoke-helpers";
import { app } from "./app";

const PUB = join(import.meta.dir, "public");

await runSmoke("static", async () => {
  const { base, stop } = serveApp(app);
  try {
    const index = await fetch(`${base}index.html`);
    check(index.status === 200, `/index.html status (got ${index.status})`);
    check((await index.text()) === readFileSync(join(PUB, "index.html"), "utf8"), "/index.html exact file body");

    const js = await fetch(`${base}assets/app.js`);
    check(js.status === 200, `/assets/app.js status (got ${js.status})`);
    check((await js.text()) === readFileSync(join(PUB, "assets/app.js"), "utf8"), "/assets/app.js exact file body");

    const css = await fetch(`${base}assets/styles.css`);
    check(css.status === 200, `/assets/styles.css status (got ${css.status})`);
    check((css.headers.get("content-type") ?? "").includes("text/css"), "/assets/styles.css text/css");

    check((await fetch(`${base}assets/nope.js`)).status === 404, "/assets/nope.js native 404");

    matches(await jsonAt(await fetch(`${base}api/ping`), 200, "/api/ping"), { pong: true }, "/api/ping");

    matches(
      await jsonAt(await fetch(`${base}api/missing`), 404, "/api/missing"),
      { error: "no such API route" },
      "/api/missing implemented 404",
    );

    matches(
      await jsonAt(await fetch(`${base}nope`), 404, "unknown route"),
      { error: "not found" },
      "unknown route app fallback",
    );
  } finally {
    stop();
  }
});
