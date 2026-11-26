import { defineApp, route, service } from "../../../src";

/**
 * Failed-startup deployment fixture (#448): the second service's init
 * throws, the first (already-initialized) service must roll back, the
 * process must exit non-zero, and no route may ever answer.
 */
const app = defineApp({
  services: {
    opens: service({
      name: "opens",
      value: { open: true },
      init: () => console.log("INIT-OK"),
      dispose: () => console.log("ROLLBACK-DISPOSED"),
    }),
    broken: service({
      name: "broken",
      value: {},
      init: () => {
        throw new Error("db unreachable");
      },
    }),
  },
  routes: {
    "/never": { GET: route({ handler: () => { throw new Error("routes must never run"); } }) },
  },
});

const server = app.serve({ hostname: "127.0.0.1", port: 0, shutdown: { signals: true } });
await server.lugasLifecycle.ready;
console.log("READY — must never print");
