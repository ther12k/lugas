/**
 * M7-005 stage two (ADR-0021): a real browser loads the INSTALLED prebuilt
 * artifact from the packed tarball over same-origin HTTP and drives the
 * documented client contract through it.
 *
 * Evidence recorded per the acceptance checklist: the loaded module URL
 * (inside node_modules of a temporary install — the source checkout is out
 * of the resolution path), the served JavaScript MIME type, and the
 * success / declared-failure / redacted-500 / empty / abort / transport
 * case matrix.
 *
 * Requires npm (pack + install) and a browser; skips when either capability
 * is absent. LUGAS_REQUIRE_BROWSER=1 fails instead of skipping.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { browserAvailable, requireBrowser, ROOT } from "./browser-env";
import { CdpBrowser } from "./cdp";
import { defineBrowserApiApp } from "./fixture-app";
import { installArtifactPackage, npmAvailable, type InstalledArtifact } from "./installed-artifact";

const PAGE = join(ROOT, "tests/browser/fixtures/stage-two.html");
const GATED = !browserAvailable || !npmAvailable();

describe.skipIf(GATED)("M7-005 stage two: installed artifact in a real browser", () => {
  let installed: InstalledArtifact;

  test("artifact loads from the installed tarball and drives the client contract", async () => {
    installed = await installArtifactPackage();
    const app = defineBrowserApiApp({
      files: {
        "/": PAGE,
        "/lugas-client.esm.js": installed.artifactPath,
      },
    });
    const server = app.serve({ port: 0, development: false });
    const origin = new URL(server.url).origin;
    const browser = await CdpBrowser.launch(requireBrowser());
    try {
      const raw = await browser.evaluateInNewPage(
        `${origin}/`,
        `(async () => {
            const t0 = Date.now();
            while (!window.__done && Date.now() - t0 < 15000) await new Promise(r => setTimeout(r, 50));
            return JSON.stringify({ done: window.__done === true, started: window.__started === true, pageError: window.__pageError ?? null, moduleUrl: window.__moduleUrl ?? null, results: window.__results ?? null });
          })()`,
      );
      const { done, started, pageError, moduleUrl, results } = JSON.parse(raw) as {
        done: boolean;
        started: boolean;
        pageError: string | null;
        moduleUrl: string | null;
        results: Record<string, { ok: true; value: unknown } | { ok: false; error: string }> | null;
      };
      if (!done) {
        throw new Error(`stage-two page did not finish: started=${started} pageError=${pageError} moduleUrl=${moduleUrl} results=${JSON.stringify(results)}`);
      }
      expect(done).toBe(true);
      const r = results!;

      // Loaded module path: same-origin URL backed by the installed artifact.
      expect(moduleUrl).toStartWith(`${origin}/`);
      expect(moduleUrl).toEndWith("/lugas-client.esm.js");
      // The backing file on disk is the installed tarball's artifact — the
      // source checkout is not on this page's resolution path.
      expect(installed.artifactPath).toContain("/node_modules/lugas/build/");

      // Correct JavaScript MIME type from the native asset mount.
      expect(String(r["mime"] && r["mime"].ok ? r["mime"].value : "")).toStartWith("text/javascript");

      // Success case with typed result shape.
      expect(r["typed-ok"]).toEqual({
        ok: true,
        value: { ok: true, status: 200, data: { ok: true, greet: "hi" } },
      });
      // Declared application failure keyed by its real status.
      expect(r["typed-conflict"]).toEqual({
        ok: true,
        value: { ok: false, status: 409, isProblem: true },
      });
      // 500 redacted through the artifact: no thrown secret in the error slot.
      expect(r["typed-server-error"]).toEqual({
        ok: true,
        value: { ok: false, status: 500, leaksSecret: false },
      });
      // Empty success: parsed data is undefined.
      expect(r["typed-empty"]).toEqual({
        ok: true,
        value: { ok: true, status: 204 },
      });
      // Cancellation propagates as AbortError, nothing fabricated.
      expect(r["typed-abort"]).toEqual({ ok: false, error: "AbortError" });
      // Transport failure identity survives the artifact client.
      expect(r["typed-transport"]).toEqual({ ok: false, error: "TypeError" });
    } finally {
      await browser.close();
      await server.stop(true);
      installed.cleanup();
    }
  }, 120000);
});
