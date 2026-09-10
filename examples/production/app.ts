import { defineApp, route, json, service } from "../../src/index";

export const app = defineApp({
  // Conservative security baseline on every pipeline response (CSP/HSTS stay opt-in).
  secureHeaders: true,
  // GET /health (liveness) and GET /ready (readiness) over the service lifecycle.
  health: true,
  services: {
    db: service({
      name: "db",
      value: { connected: false } as { connected: boolean },
      init: async (db) => {
        db.connected = true; // stand-in for a real connection
      },
      dispose: async (db) => {
        db.connected = false;
      },
    }),
  },
  routes: {
    "/api/ping": {
      GET: route<{ db: { connected: boolean } }>({
        handler: (ctx) => json(200, { pong: true, db: ctx.services.db.connected }),
      }),
    },
  },
});

export default app;
