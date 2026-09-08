/**
 * Signal-path fixture (M7-004): installs opt-in SIGTERM handling, waits for
 * the shutdown outcome, prints it, and exits cleanly. The parent test sends
 * SIGTERM so the signal path is proven to drive the same coordinator as a
 * programmatic stop.
 */
import { defineApp, json, route, service } from "../../../src";

const disposed: string[] = [];
const app = defineApp({
  services: {
    svc: service({
      name: "svc",
      value: { open: true },
      dispose: () => {
        disposed.push("svc");
      },
    }),
  },
  routes: {
    "/ping": { GET: route({ handler: () => json(200, { ok: true }) }) },
  },
});

const server = app.serve({ port: 0, shutdown: { signals: true } });
console.log("READY");
const outcome = await server.lugasLifecycle.shutdown();
console.log("SIGNAL-OUTCOME", JSON.stringify({ cooperated: outcome.cooperated, disposalCompleted: outcome.disposalCompleted }));
if (!disposed.includes("svc")) {
  console.error("service was not disposed on the signal path");
  process.exit(1);
}
process.exit(0);
