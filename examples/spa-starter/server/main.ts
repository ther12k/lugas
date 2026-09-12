/**
 * Production entry: one Bun process serving the typed API, the built
 * frontend assets, and the SPA navigation fallback (ADR-0037).
 *
 * Graceful shutdown is opt-in (ADR-0020): SIGINT/SIGTERM drain and dispose,
 * which the starter's test asserts.
 */
import { createApp } from "./app";

const app = createApp();
const server = app.serve({
  port: Number(process.env.PORT ?? 0),
  development: false,
  shutdown: { signals: true, drainDeadlineMs: 5_000 },
});
console.log(`LUGAS_STARTER_READY ${new URL(server.url).origin}`);
