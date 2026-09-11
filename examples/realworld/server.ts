/**
 * Serve entrypoint for the realworld reference app.
 *
 * Run: bun run examples/realworld/server.ts
 *
 * Then try (cookies via a jar file for the auth-gated routes):
 *   curl -s localhost:3000/health
 *   curl -s localhost:3000/users
 *   curl -sc /tmp/rw.jar -X POST localhost:3000/auth/login -H 'content-type: application/json' -d '{"name":"ada"}'
 *   curl -sb /tmp/rw.jar localhost:3000/me
 *   curl -sb /tmp/rw.jar -N localhost:3000/events
 */
import { app } from "./app";

const server = app.serve({
  port: Number(process.env.PORT ?? 3000),
  shutdown: { signals: true },
});

console.log(`realworld app listening on ${server.url}`);
console.log(`  OpenAPI JSON: ${server.url}openapi.json`);
console.log(`  Scalar UI:    ${server.url}docs`);
console.log(`  Health:       ${server.url}health`);
