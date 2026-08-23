/**
 * Compile-time required-input enforcement (M4R1-006, issue #200).
 *
 * Type-only file: checked by `tsc --noEmit`, never executed. Calls that omit
 * a required input object must be compile errors; optional-input routes stay
 * callable without an input object.
 */
import { z } from "zod";
import type { AppContract } from "../../src/core/contract";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";
import { createClient, type LugasClient } from "../../src/client/create-client";

const users = defineModule({
  name: "users",
  routes: {
    "/users/:id": {
      GET: route({
        params: z.object({ id: z.string() }),
        handler: (ctx: any) => json(200, { id: ctx.params.id }),
      }),
      POST: route({
        params: z.object({ id: z.string() }),
        body: z.object({ name: z.string() }),
        handler: () => json(201, {}),
      }),
    },
  },
});

const app = defineApp({
  routes: {
    "/health": new Response("OK"),
    "/ping": {
      GET: route({ handler: () => json(200, { ok: true }) }),
    },
  },
  modules: [users],
});

type Contract = AppContract<typeof app>;
const client: LugasClient<Contract> = createClient<Contract>({ baseUrl: "https://example.com" });

// Required input object (path params) --------------------------------------

// @ts-expect-error missing required path params
client.get("/users/:id");

// @ts-expect-error missing required path params
void client.get("/users/:id");

client.get("/users/:id", { params: { id: "1" } });

// Required input object (body) ----------------------------------------------

// @ts-expect-error missing required body
client.post("/users/:id", { params: { id: "1" } });

client.post("/users/:id", { params: { id: "1" }, body: { name: "ada" } });

// Optional-input routes remain callable both ways ---------------------------

client.get("/health");
client.get("/health", {});
client.get("/ping");
client.get("/ping", {});

// Explicit null body is only valid where the schema demands it -------------

// @ts-expect-error null body not allowed on routes without a null body schema
client.post("/users/:id", { params: { id: "1" }, body: null });

export {};
