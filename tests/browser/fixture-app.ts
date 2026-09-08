/**
 * Shared API surface for the M7-005 browser stage fixtures.
 *
 * The cases mirror the documented client error semantics
 * (docs/client-error-semantics.md) so the browser lane observes the same
 * contract the unit and integration suites pin: success, declared failure,
 * redacted 500, empty success, cancellation, and transport failure.
 */
import { defineApp, empty, json, problem, route } from "../../src";

export function defineBrowserApiApp(assets: { files: Record<string, string> }) {
  return defineApp({
    assets,
    routes: {
      "/api/ok": {
        GET: route({ handler: () => json(200, { ok: true, greet: "hi" }) }),
      },
      "/api/conflict": {
        GET: route({
          handler: () => problem(409, { title: "conflict", detail: "declared failure", status: 409 }),
        }),
      },
      "/api/boom": {
        GET: route({
          handler: () => {
            throw new Error("boom-secret");
          },
        }),
      },
      "/api/empty": {
        GET: route({ handler: () => empty(204) }),
      },
      "/api/slow": {
        GET: route({
          handler: async () => {
            await Bun.sleep(300);
            return json(200, { slow: true });
          },
        }),
      },
    },
  });
}
