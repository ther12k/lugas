/**
 * Starter correctness matrix, driven against the BUILT server
 * (dist-server/main.js) running as a real subprocess with the INSTALLED
 * lugas package — not repository sources. Covers: typed GET, validated
 * mutation (including the typed framework-422 branch), cookie auth,
 * multipart upload through formBody(), SSE stream, the production build
 * (shell + deep navigation + hashed assets), API/asset error
 * distinguishability, and graceful shutdown.
 *
 * Skips when the starter is not set up (`bun run verify` inside this
 * directory); LUGAS_REQUIRE_STARTER=1 turns the skip into a failure.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const STARTER = join(import.meta.dir, "..");
type App = ReturnType<(typeof import("../server/app"))["createApp"]>;
type API = import("lugas").AppContract<App>;
const GATED =
  !existsSync(join(STARTER, "node_modules", "lugas", "package.json")) ||
  !existsSync(join(STARTER, "dist", "index.html")) ||
  !existsSync(join(STARTER, "dist-server", "main.js"));

describe.skipIf(GATED)("spa-starter: installed package, built server", () => {
  let origin = "";
  let proc: Bun.Subprocess<"ignore", "pipe", "inherit"> | undefined;
  const clientOf = async () => {
    const { createClient } = await import("lugas/client");
    return createClient<API>({ baseUrl: origin });
  };

  const startServer = async (): Promise<string> => {
    // Spawn the built entry DIRECTLY (not via `bun run`): the script-runner
    // wrapper intercepts SIGTERM and would mask the server's graceful exit 0.
    proc = Bun.spawn(["bun", "dist-server/main.js"], {
      cwd: STARTER,
      env: { ...process.env, PORT: "0" },
      stdout: "pipe",
      stdin: "ignore",
    });
    const decoder = new TextDecoder();
    const deadline = Date.now() + 15_000;
    let buffer = "";
    for (;;) {
      if (Date.now() > deadline) throw new Error("no readiness line within 15s");
      const chunk = await proc.stdout.getReader().read().then((r) => (r.done ? "" : decoder.decode(r.value)));
      if (chunk === "") throw new Error("server exited before readiness");
      buffer += chunk;
      const match = /LUGAS_STARTER_READY (\S+)/.exec(buffer);
      if (match) return match[1]!;
    }
  };

  afterAll(async () => {
    proc?.kill("SIGTERM");
    await proc?.exited.catch(() => undefined);
  });

  test("server up; typed GET through the installed client", async () => {
    origin = await startServer();
    const client = await clientOf();
    const res = await client.get("/api/hello");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.message).toBe("hello from lugas");
  });

  test("validated mutation: 201 success and the typed framework-422 branch", async () => {
    const client = await clientOf();
    const ok = await client.post("/api/greetings", { body: { name: "Ada" } });
    expect(ok.status).toBe(201);
    if (ok.ok) expect(ok.data.greeting).toBe("Hello, Ada!");

    const invalid = await client.post("/api/greetings", {
      // @ts-expect-error deliberately invalid for the runtime branch
      body: { name: "" },
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.status).toBe(422); // framework failure branch (RF-3), no cast
      expect(invalid.error.code).toBe("VALIDATION_FAILED");
    }
  });

  test("cookie auth: 401 before login, session after (browser-managed cookies)", async () => {
    const before = await fetch(`${origin}/api/me`);
    expect(before.status).toBe(401);
    expect(((await before.json()) as { code: string }).code).toBe("NO_SESSION");

    const login = await fetch(`${origin}/api/login`, { method: "POST" });
    expect(login.status).toBe(200);
    const setCookie = login.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("lugas_session=");
    expect(setCookie).toContain("HttpOnly");

    const after = await fetch(`${origin}/api/me`, {
      headers: { cookie: /lugas_session=[^;]+/.exec(setCookie)?.[0] ?? "" },
    });
    expect(after.status).toBe(200);
    expect(((await after.json()) as { id: string }).id).toBe("demo-user");
  });

  test("multipart upload through formBody(): parts preserved, last-wins view, groups via preserve mode", async () => {
    const { formBody } = await import("lugas/client");
    const client = await clientOf();
    const payload = new TextEncoder().encode("starter upload payload");
    const res = await client.post("/api/uploads", {
      body: formBody({
        note: "from the test",
        files: [new File([payload], "notes.txt", { type: "text/plain" }), new File([payload], "copy.txt", { type: "text/plain" })],
      }),
    });
    expect(res.status).toBe(201);
    if (res.ok) {
      expect(res.data.note).toBe("from the test");
      // fields/files stay last-wins (M9-005 contract): the LAST part survives.
      expect(res.data.files.map((f) => f.name)).toEqual(["copy.txt"]);
      expect(res.data.files[0]!.size).toBe(payload.byteLength);
      // repeated: "preserve" exposes every part per name (ADR-0037 follow-up).
      expect(res.data.groupSizes).toEqual({ note: 1, files: 2 });
    }
  });

  test("SSE stream: three tick events, then a heartbeat keeps the stream open", async () => {
    const res = await fetch(`${origin}/api/events`);
    expect(res.headers.get("content-type") ?? "").toContain("text/event-stream");
    const decoder = new TextDecoder();
    let text = "";
    const deadline = Date.now() + 8_000;
    // Native async iteration over the response stream; the framing contract
    // (3 ticks, then the 2s heartbeat) is asserted on the wire text.
    for await (const chunk of res.body!) {
      text += decoder.decode(chunk, { stream: true });
      if (text.includes('"n":3}') && text.includes(": heartbeat")) break;
      if (Date.now() > deadline) break;
    }
    expect(text).toContain("event: tick");
    expect(text).toContain('"n":1}');
    expect(text).toContain('"n":3}');
    expect(text).toContain(": heartbeat");
  }, 15_000);

  test("production build: shell at / and deep navigation, hashed asset with immutable cache, headers composed", async () => {
    for (const path of ["/", "/app/projects/42"]) {
      const res = await fetch(`${origin}${path}`, { headers: { accept: "text/html" } });
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('id="root"');
      expect(res.headers.get("cache-control")).toBe("no-cache");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff"); // policy-capable shell
    }
    const shell = await fetch(`${origin}/`).then((r) => r.text());
    const scriptSrc = /src="(\/assets\/[^"]+\.js)"/.exec(shell)?.[1];
    expect(scriptSrc).toBeTruthy(); // the built bundle is content-hashed
    const asset = await fetch(`${origin}${scriptSrc}`);
    expect(asset.status).toBe(200);
    expect(asset.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(asset.headers.get("content-type")).toContain("javascript");
    expect((await asset.text()).length).toBeGreaterThan(0);
  });

  test("errors stay distinguishable: API miss is API 404; unknown path is not the shell", async () => {
    const apiMiss = await fetch(`${origin}/api/missing`, { headers: { accept: "text/html" } });
    expect(apiMiss.status).toBe(404);
    expect(apiMiss.headers.get("content-type") ?? "").not.toContain("text/html");

    const nowhere = await fetch(`${origin}/nothing-here`, { headers: { accept: "text/html" } });
    expect(nowhere.status).toBe(404);
    expect(await nowhere.text()).not.toContain('id="root"');
  });

  test("graceful shutdown: SIGTERM drains to exit 0 (ADR-0020)", async () => {
    proc!.kill("SIGTERM");
    const exitCode = await Promise.race([
      proc!.exited,
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 8_000)),
    ]);
    expect(exitCode).toBe(0);
    proc = undefined;
  });
});
