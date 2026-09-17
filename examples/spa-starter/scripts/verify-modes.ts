/**
 * Distribution-mode parity check (CA-22): the SAME unbundled server entry
 * (`server/main.ts`) run in Lugas's two distribution modes —
 *
 *   raw :  bun server/main.ts                      → installed TypeScript source
 *   dist:  bun --conditions=lugas-dist server/main.ts → installed emitted JavaScript
 *
 * This is a COMPATIBILITY check, not a benchmark: it verifies that both
 * modes resolve different representations of the same package version and
 * return the same responses. No timing or memory figures are measured or
 * claimed. The production bundle (dist-server/main.js) is a separate
 * concern: bundling resolves Lugas imports at BUILD time, so a runtime
 * condition cannot demonstrate distribution selection there.
 *
 * Prerequisites: `bun run setup && bun run build` (installed package with
 * both representations + built frontend for the SPA shell).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { raceWithTimer, readinessOrigin, stopServer, type ManagedProcess } from "./lib/server-process";

const STARTER = join(import.meta.dir, "..");
const LUGAS_PKG = join(STARTER, "node_modules", "lugas");
/** Must match server/app.ts (parity asserts the cookie's identity). */
const SESSION_COOKIE = "lugas_session";

function fail(message: string): never {
  console.error(`MODES-PARITY-FAIL ${message}`);
  process.exit(1);
}

function requireFile(path: string): string {
  if (!existsSync(path)) fail(`missing ${path} — run: bun run setup && bun run build`);
  return readFileSync(path, "utf8");
}

function frameworkVersionOf(file: string): string {
  return /FRAMEWORK_VERSION\s*=\s*"([^"]+)"/.exec(requireFile(file))?.[1] ?? fail(`no FRAMEWORK_VERSION in ${file}`);
}

/** One parity probe result. */
interface Reply {
  status: number;
  contentType: string | null;
  body: string;
}

async function request(url: string, init?: RequestInit): Promise<Reply> {
  return raceWithTimer(
    (async () => {
      const res = await fetch(url, init);
      const reply: Reply = {
        status: res.status,
        contentType: res.headers.get("content-type"),
        body: await res.text(),
      };
      // JSON parse now: any later deepEqual failure should not blame transport
      return reply;
    })(),
    10_000,
    `request exceeded 10s: ${url}`,
  );
}

function expectEqual(label: string, raw: Reply, dist: Reply): void {
  const same =
    raw.status === dist.status &&
    raw.contentType === dist.contentType &&
    raw.body === dist.body;
  if (!same) {
    fail(
      `${label} differs between modes\n` +
        `  raw : ${raw.status} ${raw.contentType} ${raw.body.slice(0, 200)}\n` +
        `  dist: ${dist.status} ${dist.contentType} ${dist.body.slice(0, 200)}`,
    );
  }
}

async function spawnMode(args: string[]): Promise<{ proc: ManagedProcess; origin: string }> {
  const proc = Bun.spawn([process.execPath, ...args, "server/main.ts"], {
    cwd: STARTER,
    env: { ...process.env, PORT: "0" },
    stdout: "pipe",
    stdin: "ignore",
  }) as unknown as ManagedProcess;
  const origin = await readinessOrigin(proc, { pattern: /LUGAS_STARTER_READY (\S+)/, timeoutMs: 15_000 });
  return { proc, origin };
}

async function main(): Promise<void> {
  // 1. Resolution: prove the two invocations select different files from the
  //    SAME installed package (the mechanism this walkthrough demonstrates).
  const probe = (extra: string[]) => {
    const res = Bun.spawnSync([process.execPath, ...extra, "-e", "console.log(Bun.resolveSync('lugas', process.cwd()))"], { cwd: STARTER });
    return new TextDecoder().decode(res.stdout).trim();
  };
  const rawPath = probe([]);
  const distPath = probe(["--conditions=lugas-dist"]);
  if (!rawPath.endsWith("src/index.ts")) fail(`raw mode did not resolve TypeScript source: ${rawPath}`);
  if (!distPath.endsWith("dist/index.js")) fail(`dist mode did not resolve emitted JavaScript: ${distPath}`);

  // 2. Version identity: one package, one version, one stamp in both files.
  const pkgVersion = (JSON.parse(requireFile(join(LUGAS_PKG, "package.json"))) as { version: string }).version;
  const srcStamp = frameworkVersionOf(join(LUGAS_PKG, "src", "internal", "framework-version.ts"));
  const distStamp = frameworkVersionOf(join(LUGAS_PKG, "dist", "internal", "framework-version.js"));
  if (!(pkgVersion === srcStamp && srcStamp === distStamp)) {
    fail(`version identity mismatch: package=${pkgVersion} src=${srcStamp} dist=${distStamp}`);
  }

  // 3. Response parity on representative routes (fresh processes → empty
  //    stores in both, so list/422/401/shell bodies are deterministic).
  const raw = await spawnMode([]);
  const dist = await spawnMode(["--conditions=lugas-dist"]);
  const checks: string[] = [];
  try {
    expectEqual(
      "GET /api/tasks (empty list)",
      await request(`${raw.origin}/api/tasks`),
      await request(`${dist.origin}/api/tasks`),
    );
    checks.push("GET /api/tasks");

    const post = (origin: string, title: string) =>
      request(`${origin}/api/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
    expectEqual("POST /api/tasks invalid (422 Problem Details)", await post(raw.origin, ""), await post(dist.origin, ""));
    checks.push("POST /api/tasks → 422 with identical Problem Details");

    const createdRaw = await post(raw.origin, "parity probe");
    const createdDist = await post(dist.origin, "parity probe");
    const shapeOf = (reply: Reply) => Object.keys(JSON.parse(reply.body) as Record<string, unknown>).sort().join(",");
    if (createdRaw.status !== 201 || createdDist.status !== 201) fail(`valid create was not 201 in both modes: ${createdRaw.status}/${createdDist.status}`);
    if (shapeOf(createdRaw) !== shapeOf(createdDist)) fail(`201 payload shape differs: ${shapeOf(createdRaw)} vs ${shapeOf(createdDist)}`);
    checks.push("POST /api/tasks → 201 with identical payload shape");

    const complete = (origin: string, id: string) =>
      request(`${origin}/api/tasks/${id}/complete`, { method: "POST" });
    const idRaw = (JSON.parse(createdRaw.body) as { id: string }).id;
    const idDist = (JSON.parse(createdDist.body) as { id: string }).id;
    expectEqual(
      "POST /api/tasks/:id/complete without session (401 NO_SESSION)",
      await complete(raw.origin, idRaw),
      await complete(dist.origin, idDist),
    );
    checks.push("POST /api/tasks/:id/complete → 401 with identical Problem Details");

    expectEqual(
      "GET / (SPA shell, same build)",
      await request(`${raw.origin}/`, { headers: { accept: "text/html" } }),
      await request(`${dist.origin}/`, { headers: { accept: "text/html" } }),
    );
    checks.push("GET / → identical shell bytes");

    // --- Full contract parity (CA-25): every remaining AppContract route. ---

    expectEqual(
      "GET /api/ready",
      await request(`${raw.origin}/api/ready`),
      await request(`${dist.origin}/api/ready`),
    );
    checks.push("GET /api/ready → identical body");

    expectEqual(
      "GET /api/hello",
      await request(`${raw.origin}/api/hello`),
      await request(`${dist.origin}/api/hello`),
    );
    checks.push("GET /api/hello → identical body");

    const greet = (origin: string, name: string) =>
      request(`${origin}/api/greetings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
    expectEqual("POST /api/greetings valid", await greet(raw.origin, "Parity"), await greet(dist.origin, "Parity"));
    expectEqual("POST /api/greetings invalid (422)", await greet(raw.origin, ""), await greet(dist.origin, ""));
    checks.push("POST /api/greetings → valid + 422 identical");

    const upload = (origin: string) => {
      const form = new FormData();
      form.append("note", "parity");
      form.append("file", new Blob([new TextEncoder().encode("parity bytes")], { type: "text/plain" }), "parity.txt");
      return request(`${origin}/api/uploads`, { method: "POST", body: form });
    };
    expectEqual("POST /api/uploads (multipart)", await upload(raw.origin), await upload(dist.origin));
    checks.push("POST /api/uploads → identical multipart report");

    expectEqual(
      "GET /api/me anonymous (401 NO_SESSION)",
      await request(`${raw.origin}/api/me`),
      await request(`${dist.origin}/api/me`),
    );
    checks.push("GET /api/me → 401 identical");

    // SSE: compare the first delivered frame (deterministic tick #1).
    const firstSseFrame = async (origin: string) => {
      const res = await fetch(`${origin}/api/events`);
      const reader = (res.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const boundary = buffer.indexOf("\n\n");
        if (boundary >= 0) {
          const frame = buffer.slice(0, boundary);
          await reader.cancel();
          return `${res.status}|${res.headers.get("content-type")}|${frame}`;
        }
      }
      await reader.cancel();
      return `${res.status}|${res.headers.get("content-type")}|<no frame>`;
    };
    const sseRaw = await firstSseFrame(raw.origin);
    const sseDist = await firstSseFrame(dist.origin);
    if (sseRaw !== sseDist) {
      fail(`GET /api/events first SSE frame differs between modes\n  raw : ${sseRaw}\n  dist: ${sseDist}`);
    }
    checks.push("GET /api/events → identical first SSE frame");

    // Login: body must be byte-identical; the cookie token is random, so
    // assert its identity (name + HttpOnly) rather than its value.
    const login = async (origin: string): Promise<string> => {
      const res = await fetch(`${origin}/api/login`, { method: "POST" });
      const body = await res.text();
      const setCookie = res.headers.getSetCookie()[0] ?? fail(`login set no cookie (${origin})`);
      if (!setCookie.startsWith(`${SESSION_COOKIE}=`)) fail(`login cookie name: ${setCookie}`);
      if (!/httponly/i.test(setCookie)) fail(`login cookie not HttpOnly: ${setCookie}`);
      if (body !== JSON.stringify({ ok: true })) fail(`login body: ${body}`);
      return setCookie.split(";")[0]!;
    };
    const cookieRaw = await login(raw.origin);
    const cookieDist = await login(dist.origin);
    checks.push("POST /api/login → {ok:true} + HttpOnly session cookie in both");

    // Authenticated lifecycle per mode (symmetric stores): create →
    // complete → delete → re-delete 404.
    const withCookie = (origin: string, cookie: string) => ({ headers: { cookie } });
    const create = async (origin: string, cookie: string) => {
      const res = await fetch(`${origin}/api/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ title: "lifecycle parity" }),
      });
      if (res.status !== 201) fail(`authed create status ${res.status}`);
      return (await res.json()) as { id: string; completed: boolean };
    };
    const taskRaw = await create(raw.origin, cookieRaw);
    const taskDist = await create(dist.origin, cookieDist);
    if (taskRaw.completed !== taskDist.completed) fail("created task state differs");

    const completeAuthed = async (origin: string, cookie: string, id: string) =>
      request(`${origin}/api/tasks/${id}/complete`, { method: "POST", headers: { cookie } });
    const doneRaw = await completeAuthed(raw.origin, cookieRaw, taskRaw.id);
    const doneDist = await completeAuthed(dist.origin, cookieDist, taskDist.id);
    if (doneRaw.status !== 200 || doneDist.status !== 200) fail(`complete status ${doneRaw.status}/${doneDist.status}`);
    const normalize = (r: Reply) => { const t = JSON.parse(r.body) as Record<string, unknown>; return { completed: t.completed }; };
    if (JSON.stringify(normalize(doneRaw)) !== JSON.stringify(normalize(doneDist))) fail("completed task state differs");
    checks.push("POST /api/tasks/:id/complete (authed) → 200 with completed=true in both");

    const del = async (origin: string, cookie: string, id: string) =>
      request(`${origin}/api/tasks/${id}`, { method: "DELETE", headers: { cookie } });
    const goneRaw = await del(raw.origin, cookieRaw, taskRaw.id);
    const goneDist = await del(dist.origin, cookieDist, taskDist.id);
    if (goneRaw.status !== 204 || goneDist.status !== 204) fail(`delete status ${goneRaw.status}/${goneDist.status}`);
    checks.push("DELETE /api/tasks/:id (authed) → 204 in both");

    expectEqual(
      "DELETE /api/tasks/:id unknown (404 TASK_NOT_FOUND)",
      await del(raw.origin, cookieRaw, taskRaw.id),
      await del(dist.origin, cookieDist, taskDist.id),
    );
    checks.push("DELETE unknown id → identical 404 Problem Details");

    expectEqual(
      "GET /app/tasks (SPA navigation fallback)",
      await request(`${raw.origin}/app/tasks`, { headers: { accept: "text/html" } }),
      await request(`${dist.origin}/app/tasks`, { headers: { accept: "text/html" } }),
    );
    checks.push("GET /app/* → identical fallback shell bytes");
  } finally {
    const stoppedRaw = await stopServer(raw.proc).catch(() => undefined);
    const stoppedDist = await stopServer(dist.proc).catch(() => undefined);
    if (stoppedRaw?.exitCode !== 0 || stoppedDist?.exitCode !== 0) {
      fail(`mode servers did not shut down cleanly: raw=${stoppedRaw?.exitCode} dist=${stoppedDist?.exitCode}`);
    }
  }

  console.log(`MODES-PARITY-OK lugas@${pkgVersion}`);
  console.log(`  raw : ${rawPath.split("node_modules/")[1]}`);
  console.log(`  dist: ${distPath.split("node_modules/")[1]}`);
  for (const check of checks) console.log(`  ✓ ${check}`);
}

await main();
