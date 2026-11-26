/**
 * drizzle example smoke (CA-25): this example's server is a self-contained
 * walkthrough — it serves, self-fetches /users, and performs a graceful
 * lifecycle shutdown. The smoke runs the real documented process on a free
 * port (PORT env, same as the sibling examples' server entries) and
 * asserts its output and clean exit.
 */
import { runSmoke, check } from "../smoke-helpers";

await runSmoke("drizzle", async () => {
  const probe = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  const port = probe.port;
  probe.stop(true);

  const proc = Bun.spawn([process.execPath, "examples/drizzle/server.ts"], {
    cwd: import.meta.dir + "/../..",
    env: { ...process.env, PORT: String(port) },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([
    new Response(proc.stdout as ReadableStream).text(),
    new Response(proc.stderr as ReadableStream).text(),
  ]);
  const code = await proc.exited;

  check(code === 0, `server exit code (got ${String(code)})${err ? ` stderr: ${err.slice(0, 300)}` : ""}`);
  check(out.includes("GET /users -> 200"), `self-fetch line (got: ${out.slice(0, 300)})`);
  check(out.includes('"name":"ada"') && out.includes('"name":"grace"'), "seeded rows ada+grace in response");
  check(out.includes("graceful shutdown"), "lifecycle shutdown line (closeOnDispose)");
});
