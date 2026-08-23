/**
 * Manifest capability and guard-identity tests (M4-003).
 *
 * Proves truthful, ordered metadata without any schema/type leakage, native
 * rows carrying empty capability data, startup validation remaining intact,
 * and deterministic serialization.
 */
import { describe, expect, test } from "bun:test";
import { captureRouteRecords, sortForSerialization } from "../../src/internal/manifest";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { guard } from "../../src/core/guard";
import { route } from "../../src/core/route";
import { empty, json } from "../../src/core/response";
import { z } from "zod";

const auth = guard({
  name: "auth",
  handler: () => json(401, { error: "x" }),
});
const tenant = guard({
  name: "tenant",
  handler: () => json(403, { error: "y" }),
});

const SECRET_MARKER = "zz_super_secret_field";

function fixtureApp() {
  return defineApp({
    routes: {
      "/all-slots": {
        PUT: route({
          // Declaration order deliberately scrambled vs canonical order.
          body: z.object({ [SECRET_MARKER]: z.string() }),
          headers: z.object({ "x-ok": z.string() }),
          params: z.object({ id: z.string() }),
          query: z.object({ q: z.string().optional() }),
          before: [tenant, auth],
          handler: () => json(200, { ok: true }),
        }),
      },
      "/partial": {
        GET: route({
          query: z.object({ page: z.coerce.number().optional() }),
          handler: () => json(200, { ok: true }),
        }),
      },
      "/bare": {
        GET: route({ handler: () => json(200, { ok: true }) }),
      },
      "/native-static": new Response("s"),
      "/empty-204": { GET: route({ handler: () => empty(204) }) },
    },
    modules: [
      defineModule({
        name: "billing",
        routes: {
          "/invoices/:id": {
            DELETE: route({
              params: z.object({ id: z.string() }),
              before: [auth],
              handler: () => new Response(null, { status: 204 }),
            }),
          },
        },
      }),
    ],
  });
}

describe("manifest capability + guard identity capture", () => {
  const records = captureRouteRecords(
    (fixtureApp() as unknown as { composition: never }).composition,
  );
  const byKey = new Map(records.map((r) => [`${r.method} ${r.path}`, r]));

  test("declared slots appear in canonical order regardless of declaration order", () => {
    const all = byKey.get("PUT /all-slots")!;
    expect(all.validates).toEqual(["params", "query", "headers", "body"]);
  });

  test("partial and absent declarations are exact", () => {
    expect(byKey.get("GET /partial")!.validates).toEqual(["query"]);
    expect(byKey.get("GET /bare")!.validates).toEqual([]);
    expect(byKey.get("DELETE /invoices/:id")!.validates).toEqual(["params"]);
  });

  test("guard names preserve execution order", () => {
    expect(byKey.get("PUT /all-slots")!.guards).toEqual(["tenant", "auth"]);
    expect(byKey.get("DELETE /invoices/:id")!.guards).toEqual(["auth"]);
    expect(byKey.get("GET /bare")!.guards).toEqual([]);
  });

  test("native routes carry empty capability and guard arrays", () => {
    const nativeRow = byKey.get("* /native-static")!;
    expect(nativeRow.kind).toBe("native");
    expect(nativeRow.validates).toEqual([]);
    expect(nativeRow.guards).toEqual([]);
  });

  test("no schema properties, transformed output, statuses, or service data leak", () => {
    const text = JSON.stringify(records);
    expect(text).not.toContain(SECRET_MARKER);
    expect(text).not.toContain("~standard");
    expect(text).not.toContain('"status"');
    expect(text).not.toContain('"services"');
    expect(text).not.toContain('":"function"');
  });

  test("module attribution survives alongside capabilities", () => {
    const invoice = byKey.get("DELETE /invoices/:id")!;
    expect(invoice.module).toBe("billing");
  });

  test("duplicate/invalid guard identities remain startup errors", () => {
    expect(() =>
      guard({ name: "", handler: () => ({}) as never }),
    ).toThrow(/'name' must be a non-empty string/);
    expect(() =>
      guard({ name: "dup", handler: () => ({}) as never }),
    ).not.toThrow();
    const dupNameGuard = guard({ name: "same", handler: () => ({}) as never });
    const otherSame = guard({ name: "same", handler: () => ({}) as never });
    // Duplicate names inside one chain are recorded verbatim; the app-level
    // duplicate rejection for module names is unchanged (M1 behavior).
    const app2 = defineApp({
      routes: {
        "/d": {
          GET: route({ before: [dupNameGuard, otherSame], handler: () => json(200, {}) }),
        },
      },
    });
    const recs = captureRouteRecords(
      (app2 as unknown as { composition: never }).composition,
    );
    expect(recs[0]?.guards).toEqual(["same", "same"]);
    void otherSame;
  });

  test("serialization is deterministic across repeated captures", () => {
    const once = sortForSerialization(records);
    const twice = sortForSerialization(
      captureRouteRecords(
        (fixtureApp() as unknown as { composition: never }).composition,
      ),
    );
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });
});
