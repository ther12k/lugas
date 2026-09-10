import { defineApp, route, json } from "../../src/index";

/**
 * Dependency-free telemetry (ADR-0032): the framework emits scalar facts;
 * this example prints them. For real spans, map these two events onto
 * @opentelemetry/api exactly like docs/telemetry.md shows.
 */
export const app = defineApp({
  logging: { requestIds: true },
  telemetry: {
    onRequestStart: (e) => console.log(`[start] ${e.method} ${e.path} route=${e.route} requestId=${e.requestId ?? "-"}`),
    onRequestEnd: (e) =>
      console.log(`[end]   ${e.method} ${e.path} status=${e.status} ${e.durationMs}ms errorClass=${e.errorClass ?? "-"}`),
  },
  routes: {
    "/ping": {
      GET: route({ handler: () => json(200, { pong: true }) }),
    },
    "/crash": {
      GET: route({ handler: () => { throw new Error("boom"); } }),
    },
  },
});

export default app;
