/**
 * Consumer fixture for the paired typecheck comparison (CA-12, #415
 * amendment): a FIXED consumer workload compiled identically against two
 * source revisions. Uses only APIs available at BOTH 7fe452f and fcdf5ec
 * (defineApp/route/guard/json/problem/sse/form, zod schemas, AppContract,
 * createClient). Nothing executes — the fixture exists to be typechecked.
 */
import { defineApp, form, guard, json, problem, route, sse } from "./src/index";
import type { AppContract } from "./src/index";
import { createClient } from "./src/client/index";
import { z } from "zod";

type Services = {
  db: { find: (id: string) => Promise<{ id: string } | null> };
  jobs: { enqueue: (name: string) => Promise<void> };
};

const auth = guard({
  name: "auth",
  handler: () => ({ user: { id: "u_1", role: "admin" as const } }),
});

const app = defineApp({
  services: {
    db: { find: async () => null },
    jobs: { enqueue: async () => undefined },
  } satisfies Services,
  routes: {
    "/invoices/:id": {
      PUT: route({
        params: z.object({ id: z.coerce.number() }),
        query: z.object({ verbose: z.boolean().default(false) }),
        headers: z.object({ authorization: z.string().min(1) }),
        body: z.object({ amount: z.number().positive(), currency: z.string().length(3) }),
        before: [auth],
        handler: (ctx) =>
          json(200, {
            id: ctx.params.id,
            user: ctx.user.id,
            role: ctx.user.role,
            amount: ctx.body.amount,
            verbose: ctx.query.verbose,
          }),
      }),
    },
    "/uploads": {
      POST: route({
        body: form({ maxFileSize: 1024 * 1024 }),
        handler: (ctx) => json(201, { note: ctx.body.fields.note ?? null, fileCount: Object.keys(ctx.body.files).length }),
      }),
    },
    "/events": {
      GET: route({
        handler: () =>
          sse({
            heartbeatMs: 15_000,
            start: (writer) => {
              writer.send({ data: "connected" });
              return () => undefined;
            },
          }),
      }),
    },
    "/legacy": {
      GET: route({
        before: [guard({ name: "legacy", handler: () => problem(401, { title: "Unauthorized", status: 401 }) })],
        handler: () => json(200, { ok: true }),
      }),
    },
  },
});

type API = AppContract<typeof app>;
const client = createClient<API>({ baseUrl: "http://fixture.local" });

async function exercise(): Promise<readonly [number, number, number]> {
  const invoice = await client.put("/invoices/:id", {
    params: { id: "7" },
    query: { verbose: true },
    headers: { authorization: "Bearer fixture" },
    body: { amount: 5, currency: "USD" },
  });
  // The /uploads route is declared (exercising form() descriptor inference
  // server-side at both revisions) but not called through the client: its
  // client contract changed shape between the revisions being compared
  // (formBody() wrapper), so a call here would not compile identically.
  const events = await client.get("/events");
  const legacy = await client.get("/legacy");
  return [invoice.status, events.status, legacy.status] as const;
}

type ExerciseStatuses = Awaited<ReturnType<typeof exercise>>;
const _statuses: ExerciseStatuses = [200, 200, 200];
void _statuses;
void exercise;
