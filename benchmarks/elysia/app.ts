/**
 * M0-008 — Idiomatic Elysia 2 comparison fixture.
 *
 * This file is benchmark scaffolding only. Elysia is a dev dependency of the
 * repository and MUST NOT be imported by any Lugas runtime code (AGENTS.md
 * rule 6). Measurement happens in M5-003; this fixture records no results.
 *
 * The endpoint set mirrors the controlled scenarios defined by the benchmark
 * methodology and the raw-Bun fixtures of M0-007 (payload/status alignment is
 * checked by M5-001):
 *
 *   GET  /__ready    readiness probe (deterministic readiness signal)
 *   GET  /static     native static response
 *   GET  /json-sync  plain synchronous JSON route
 *   GET  /json-async async JSON route (same payload, awaited microtask)
 *   GET  /items/:id  params route (string echo, like raw Bun path params)
 *   POST /echo       JSON body validation (TypeBox schema)
 *   GET  /search     query validation with numeric coercion
 *   GET  /guarded    guard-only route (derive + beforeHandle policy, no schema)
 *   GET  /combined   validation + guard + domain response
 *
 * Written the way Elysia 2 intends apps to be written: plugin composition,
 * metadata/configuration before the handler, TypeBox schemas, and a scoped
 * `guard`. No debug flags, no artificial handicap or boost.
 */
import { Elysia, t } from "elysia";

/**
 * Deterministic API token for the guard scenario. The fixture is not a
 * security boundary; the constant keeps guard behavior reproducible.
 */
export const FIXTURE_API_TOKEN = "bench-secret";

/** Deterministic payload shared by the sync and async JSON scenarios. */
const WORLD = { hello: "world" };

/**
 * Request-scoped context, expressed with the Elysia 2 `derive` idiom
 * (v2 merges v1's separate `resolve` into `derive`, which may be async).
 *
 * `.as("plugin")` promotes the derivation so instances that `use` this
 * plugin see `requestId`; without it Elysia 2 keeps plugin derivations
 * private to the plugin instance that declared them.
 */
const requestContext = new Elysia({ name: "bench.request-context" })
  .derive(({ headers }) => ({
    requestId: headers["x-request-id"] ?? "unset",
  }))
  .as("plugin");

/**
 * Baseline routes — no validation, no guards. Feature-equivalent to the
 * raw-Bun static/sync/async/params scenarios.
 */
const baselineRoutes = new Elysia({ name: "bench.baseline-routes" })
  .get("/static", () => "ok")
  .get("/json-sync", () => WORLD)
  .get("/json-async", async () => WORLD)
  .get("/items/:id", ({ params }) => ({ id: params.id }));

/**
 * Validation scenarios using Elysia's bundled TypeBox schemas. Note the
 * Elysia 2 argument order: the schema hook comes before the handler.
 */
const validationRoutes = new Elysia({ name: "bench.validation-routes" })
  .post(
    "/echo",
    {
      body: t.Object({
        name: t.String(),
        count: t.Optional(t.Number()),
      }),
    },
    ({ body }) => body,
  )
  .get(
    "/search",
    {
      query: t.Object({
        q: t.String(),
        limit: t.Optional(t.Number()),
      }),
    },
    ({ query }) => ({ q: query.q, limit: query.limit }),
  );

/**
 * Guard scenarios: a scoped `guard` applies one beforeHandle policy to every
 * route registered in its callback. `/guarded` isolates the guard itself;
 * `/combined` stacks validation, the derived context, and the guard.
 */
const guardedRoutes = new Elysia({ name: "bench.guarded-routes" })
  .use(requestContext)
  .guard(
    {
      beforeHandle({ headers, set }) {
        if (headers["x-api-key"] !== FIXTURE_API_TOKEN) {
          set.status = 401;
          return { error: "unauthorized" };
        }
      },
    },
    (app) =>
      app
        .get("/guarded", ({ requestId }) => ({ requestId }))
        .get(
          "/combined",
          { query: t.Object({ n: t.Number() }) },
          ({ query, requestId }) => ({ n: query.n, requestId }),
        ),
  );

/**
 * Build the comparison app. `use`-ing `requestContext` at the root keeps the
 * derive available to any route appended later by the harness, while the
 * guarded plugin re-uses it where it is actually consumed.
 *
 * The return type is inferred: Elysia encodes routes and derived context in
 * generics, and erasing them to a bare `Elysia` would discard the contract
 * the smoke test relies on.
 */
export function createBenchApp() {
  return new Elysia({ name: "bench.elysia-fixture" })
    .get("/__ready", () => "ready")
    .use(requestContext)
    .use(baselineRoutes)
    .use(validationRoutes)
    .use(guardedRoutes);
}
