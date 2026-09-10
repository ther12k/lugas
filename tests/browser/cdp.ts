/**
 * Minimal Chrome DevTools Protocol driver for the M7-005 browser lane.
 *
 * Zero-dependency by design (ADR-0016 / no new package deps): launches a
 * locally installed Chromium-family browser headless, connects over the
 * DevTools WebSocket, and evaluates one async expression per page. This is
 * the automation driver the compatibility statement previously recorded as
 * absent; it stays out of the package runtime and out of the dependency
 * graph entirely.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type BrowserLaunch = {
  /** Executable path actually used (recorded as evidence). */
  readonly executable: string;
  /** navigator.userAgent reported by the launched browser. */
  readonly userAgent: string;
};

const CANDIDATES = [
  process.env.LUGAS_BROWSER_EXECUTABLE,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
] as const;

export function findBrowserExecutable(): string | null {
  for (const candidate of CANDIDATES) {
    if (!candidate) continue;
    const probe = Bun.spawnSync([candidate, "--version"], { stdout: "pipe", stderr: "pipe" });
    if (probe.exitCode === 0) return candidate;
  }
  return null;
}

type Pending = { resolve: (value: unknown) => void; reject: (reason: unknown) => void };

/**
 * Capability wait for the browser's DevTools WebSocket, not a test
 * assertion: cold starts on loaded CI runners have been observed exceeding
 * the historical 15s (beta.4 PR #387 failed at ~17s, passed on rerun), so
 * this stays generous. Test timeouts remain the real bound.
 */
const LAUNCH_TIMEOUT_MS = 60_000;

export class CdpBrowser {
  private ws: WebSocket | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly drain: Promise<void>;
  private readonly proc: Bun.Subprocess<"ignore", "ignore", "pipe">;
  private userDataDir: string;

  private constructor(proc: Bun.Subprocess<"ignore", "ignore", "pipe">, userDataDir: string, stderrText: Promise<void>) {
    this.proc = proc;
    this.userDataDir = userDataDir;
    this.drain = stderrText;
  }

  static async launch(executable: string): Promise<CdpBrowser> {
    const userDataDir = mkdtempSync(join(tmpdir(), "lugas-browser-profile-"));
    const proc = Bun.spawn(
      [
        executable,
        "--headless=new",
        "--remote-debugging-port=0",
        `--user-data-dir=${userDataDir}`,
        "--no-sandbox",
        "--disable-gpu",
        "--no-first-run",
        "--disable-dev-shm-usage",
        "about:blank",
      ],
      { stdout: "ignore", stderr: "pipe" },
    );
    let wsUrl: string | null = null;
    const stderrText = (async (): Promise<void> => {
      const reader = (proc.stderr as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (wsUrl === null) {
          const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffer);
          if (match) wsUrl = match[1]!;
        }
      }
    })();
    const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
    while (wsUrl === null && Date.now() < deadline) await Bun.sleep(25);
    if (wsUrl === null) {
      proc.kill();
      rmSync(userDataDir, { recursive: true, force: true });
      throw new Error(`browser did not report a DevTools WebSocket within ${LAUNCH_TIMEOUT_MS / 1000}s`);
    }
    const browser = new CdpBrowser(proc, userDataDir, stderrText);
    await browser.connect(wsUrl);
    return browser;
  }

  private connect(url: string): Promise<void> {
    return new Promise((resolveConnection, rejectConnection) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => resolveConnection(undefined);
      ws.onerror = (event) => rejectConnection(new Error(`DevTools WebSocket error: ${String(event)}`));
      ws.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as {
          id?: number;
          result?: unknown;
          error?: { message: string };
        };
        if (typeof message.id === "number") {
          const waiter = this.pending.get(message.id);
          if (waiter) {
            this.pending.delete(message.id);
            if (message.error) waiter.reject(new Error(`CDP error: ${message.error.message}`));
            else waiter.resolve(message.result);
          }
        }
      };
    });
  }

  private send(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<unknown> {
    const id = this.nextId++;
    const body = { id, method, params: params ?? {}, ...(sessionId ? { sessionId } : {}) } as Record<string, unknown>;
    return new Promise((resolveCommand, rejectCommand) => {
      this.pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
      this.ws!.send(JSON.stringify(body));
    });
  }

  /** Opens one page, waits for load, evaluates one async expression, closes the page. */
  async evaluateInNewPage(url: string, expression: string, timeoutMs = 30_000): Promise<string> {
    const { targetId } = (await this.send("Target.createTarget", { url: "about:blank" })) as { targetId: string };
    const { sessionId } = (await this.send("Target.attachToTarget", { targetId, flatten: true })) as { sessionId: string };
    await this.send("Page.enable", undefined, sessionId);
    await this.send("Page.navigate", { url }, sessionId);
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const state = await this.send("Runtime.evaluate", {
        expression: "JSON.stringify({ href: location.href, ready: document.readyState })",
        returnByValue: true,
      }, sessionId);
      const { href, ready } = JSON.parse((state as { result: { value: string } }).result.value) as { href: string; ready: string };
      if (href === url && ready === "complete") break;
      if (Date.now() > deadline) throw new Error(`page did not finish loading within ${timeoutMs}ms: ${url}`);
      await Bun.sleep(25);
    }
    const evaluation = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    }, sessionId);
    await this.send("Target.closeTarget", { targetId });
    const shaped = evaluation as { result: { type: string; value?: unknown }; exceptionDetails?: { text: string; exception?: { description?: string } } };
    if (shaped.exceptionDetails) {
      throw new Error(`page evaluation failed: ${shaped.exceptionDetails.exception?.description ?? shaped.exceptionDetails.text}`);
    }
    return String(shaped.result.value);
  }

  async userAgent(): Promise<string> {
    const result = await this.evaluateInNewPage("about:blank", "navigator.userAgent");
    return result;
  }

  async close(): Promise<void> {
    try {
      await this.send("Browser.close");
    } catch {
      this.proc.kill();
    }
    await Bun.sleep(50);
    this.proc.kill();
    await this.drain.catch(() => undefined);
    rmSync(this.userDataDir, { recursive: true, force: true });
  }
}
