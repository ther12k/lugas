import { defineApp, json, route, service, sse } from "../../../src";

/**
 * Deployment smoke fixture (#448) — a real server a container run drives
 * with signals, never an in-process shutdown() call. Readiness probes and
 * stdout markers distinguish the four deployment states: starting (no READY
 * line yet), ready (READY <port> printed, /ready 200), draining (SIGTERM
 * delivered), stopped (process exited with a code).
 */
const app = defineApp({
  health: true,
  services: {
    svc: service({
      name: "svc",
      value: { open: true },
      dispose: () => {
        console.log("DISPOSED");
      },
    }),
  },
  routes: {
    "/events": {
      GET: route({
        handler: () =>
          sse({
            start: (writer) => {
              writer.send({ event: "init", data: "open" });
              const timer = setInterval(() => writer.send({ event: "tick", data: "t" }), 60);
              return () => {
                clearInterval(timer);
                console.log("SSE-CLEANUP");
              };
            },
          }),
      }),
    },
    "/fail-init": { GET: route({ handler: () => json(200, { never: true }) }) },
  },
});

const server = app.serve({ hostname: "127.0.0.1", port: 0, shutdown: { signals: true } });
await server.lugasLifecycle.ready;
console.log(`READY ${server.port}`);
// Never call shutdown here: the deployment environment drives it with SIGTERM.
