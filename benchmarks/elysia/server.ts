/**
 * M0-008 — Entrypoint for the Elysia 2 comparison fixture.
 *
 * Runtime contract for the M5 benchmark harness:
 *   - PORT env selects the listen port (default 3000; 0 = ephemeral).
 *   - The bound port is printed to stdout as `listening on port <n>`.
 *   - GET /__ready returns 200 "ready" once the server accepts requests.
 *   - SIGTERM (and SIGINT) stop the server gracefully and exit 0.
 *
 * Run with: bun run benchmarks/elysia/server.ts
 */
import { createBenchApp } from "./app";

const requestedPort = Number.parseInt(process.env.PORT ?? "3000", 10);

if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
  console.error(`invalid PORT value: ${process.env.PORT ?? "3000"}`);
  process.exit(1);
}

const app = createBenchApp();
app.listen(requestedPort);

const boundPort = app.server?.port ?? requestedPort;
console.log(`listening on port ${boundPort}`);

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`received ${signal}, shutting down`);
  await app.stop();
  process.exit(0);
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
