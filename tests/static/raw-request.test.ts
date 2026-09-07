import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { defineApp } from "../../src/core/app";
import { sendRawRequest } from "./raw-http";

/**
 * M7-001 — raw-request provenance discriminator (owner merge condition).
 *
 * Establishes WHERE encoded-path normalization happens for
 * `/assets/%2e%2e/index.html`:
 *
 * - A high-level client (`fetch`) parses string inputs through the URL
 *   Standard, which treats `%2e%2e` as a double-dot path segment and removes
 *   the preceding segment during parsing — so a 200 through `fetch` does NOT
 *   by itself prove the server normalized anything.
 * - This suite sends the request target VERBATIM over a raw TCP connection
 *   (no URL parser in the path) and records the outgoing request line plus
 *   the response. The pinned expectations below are the actual measured
 *   server behavior on Bun 1.4.0 / linux-x64.
 *
 * Bounded conclusion: for the tested verbatim request targets on the
 * recorded runtime, the native asset path returns an empty 404 without
 * invoking application not-found handling. The corresponding high-level-client
 * request is normalized before transmission.
 */
const PUB = join(import.meta.dir, "fixtures", "public");

type RawResponse = { requestLine: string; status: number; body: string };

function startAssetApp(): { server: Bun.Server<unknown>; port: number } {
  const app = defineApp({
    assets: {
      files: { "/index.html": join(PUB, "index.html") },
      dirs: { "/assets/*": join(PUB, "assets") },
    },
  });
  const server = app.serve({ port: 0, development: false });
  return { server, port: server.port! };
}

describe("M7-001 raw-request provenance (request-target sent verbatim)", () => {
  test("controls: literal asset targets serve over raw TCP", async () => {
    const { server, port } = startAssetApp();
    try {
      const page = await sendRawRequest(port!, "/index.html");
      expect(page.status).toBe(200);
      expect(page.body).toContain("ColorJoy");
      const asset = await sendRawRequest(port!, "/assets/app.js");
      expect(asset.status).toBe(200);
      expect(asset.body).toContain("colorjoyMain");
    } finally {
      server.stop(true);
    }
  });

  test("encoded double-dot target verbatim: server contains the mount (404) — no server-side route normalization", async () => {
    const { server, port } = startAssetApp();
    try {
      const raw = await sendRawRequest(port!, "/assets/%2e%2e/index.html");
      // Bounded finding: for the tested verbatim request target on the recorded
      // runtime, the native asset path returns an empty 404 without invoking
      // application not-found handling. The corresponding high-level-client
      // request is normalized before transmission per the WHATWG URL Standard.
      expect(raw.status).toBe(404);
      expect(raw.body).not.toContain("ColorJoy");

      // Contrast: a high-level client normalizes before the server sees it.
      const viaFetch = await fetch(`http://127.0.0.1:${port}/assets/%2e%2e/index.html`);
      expect(viaFetch.status).toBe(200);
      expect(await viaFetch.text()).toContain("ColorJoy");
    } finally {
      server.stop(true);
    }
  });

  test("raw encoded target against an API route: bare transport 404, not the app not-found policy", async () => {
    const app = defineApp({
      routes: { "/api/ping": { GET: (() => new Response("api")) as never } as never },
      assets: { dirs: { "/assets/*": join(PUB, "assets") } },
      notFound: () => new Response(JSON.stringify({ problem: "app-404" }), { status: 404, headers: { "content-type": "application/json" } }),
    });
    const server = app.serve({ port: 0, development: false });
    try {
      // Measured: the raw encoded target is declined by the native routing
      // layer with a bare 404 and empty body — it never reaches the app's
      // notFound policy (which answers only requests dispatched through the
      // fallback fetch). Contrast: the client-normalized path hits the route.
      const raw = await sendRawRequest(server.port!, "/assets/%2e%2e/api/ping");
      expect(raw.status).toBe(404);
      expect(raw.body).toBe("");
      const viaFetch = await fetch(`http://127.0.0.1:${server.port}/assets/%2e%2e/api/ping`);
      expect(viaFetch.status).toBe(200);
      expect(await viaFetch.text()).toBe("api");
    } finally {
      server.stop(true);
    }
  });
});
