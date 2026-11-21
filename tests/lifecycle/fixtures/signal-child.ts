import { defineApp, service, websocket } from "../../../src";

const app = defineApp({
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
    "/socket": { GET: websocket({ message: () => {} }) },
  },
});

const server = app.serve({ hostname: "127.0.0.1", port: 0, shutdown: { signals: true } });
await server.lugasLifecycle.ready;
console.log(`READY ${server.port}`);
// Never call shutdown here: the parent must drive it with SIGTERM.
