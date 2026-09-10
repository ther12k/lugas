/**
 * M7-005 stage one (ADR-0021): plain-JS no-bundler page with ordinary
 * `fetch` against a live Lugas server — browser-to-server evidence.
 * This stage does NOT exercise the packaged Lugas client; it does not close
 * stage two.
 *
 * Runs in a real headless browser through the zero-dependency CDP driver.
 * Skips when no browser is available; LUGAS_REQUIRE_BROWSER=1 fails instead.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { browserAvailable, requireBrowser, ROOT } from "./browser-env";
import { CdpBrowser } from "./cdp";
import { defineBrowserApiApp } from "./fixture-app";

const PAGE = join(ROOT, "tests/browser/fixtures/stage-one.html");

type CaseOutcome = { ok: true; value: unknown } | { ok: false; error: string };

describe.skipIf(!browserAvailable)("M7-005 stage one: plain fetch, no bundler, no artifact", () => {
  test("same-origin page exercises the API with ordinary fetch", async () => {    const app = defineBrowserApiApp({ files: { "/": PAGE } });
    const server = app.serve({ port: 0, development: false });
    const origin = new URL(server.url).origin;
    const browser = await CdpBrowser.launch(requireBrowser());
    try {
      const raw = await browser.evaluateInNewPage(
        `${origin}/`,
        `(async () => {
            const t0 = Date.now();
            while (!window.__done && Date.now() - t0 < 30000) await new Promise(r => setTimeout(r, 50));
            return JSON.stringify({ done: window.__done === true, started: window.__started === true, pageError: window.__pageError ?? null, results: window.__results ?? null });
          })()`,
      );
      const { done, started, pageError, results } = JSON.parse(raw) as {
        done: boolean;
        started: boolean;
        pageError: string | null;
        results: Record<string, CaseOutcome> | null;
      };
      if (!done) {
        throw new Error(`stage-one page did not finish: started=${started} pageError=${pageError} results=${JSON.stringify(results)}`);
      }
      expect(done).toBe(true);
      expect(results).not.toBeNull();
      const r = results!;

      // Success
      expect(r["ok"]).toEqual({ ok: true, value: { status: 200, body: { ok: true, greet: "hi" } } });
      // Declared failure surfaces its status and Problem Details media type
      expect(r["conflict"]).toEqual({
        ok: true,
        value: { status: 409, contentType: "application/problem+json" },
      });
      // 500 is redacted end-to-end: the thrown secret never reaches the page
      expect(r["serverError"]).toEqual({ ok: true, value: { status: 500, leaksSecret: false } });
      // Empty success
      expect(r["empty"]).toEqual({ ok: true, value: { status: 204, body: "" } });
      // Cancellation propagates as AbortError
      expect(r["abort"]).toEqual({ ok: false, error: "AbortError" });
      // Transport failure stays a raw TypeError (connection refused)
      expect(r["transport"]).toEqual({ ok: false, error: "TypeError" });
    } finally {
      await browser.close();
      await server.stop(true);
    }
  }, 60000);
});
