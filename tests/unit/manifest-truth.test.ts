/**
 * Manifest v1 truthfulness probes (M4R1-008, issue #202, ADR-0017).
 *
 * - Bare route() descriptors produce exactly one "*" lugas record
 * - Serialized methods use only ADR-sanctioned representations
 * - Record count matches the prepared fact set (single interpreter)
 * - frameworkVersion is a generated constant in sync with package.json
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { defineApp } from "../../src/core/app";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { guard } from "../../src/core/guard";
import { json } from "../../src/core/response";
import { captureRouteRecords, serializeManifest, type LugasManifestV1 } from "../../src/internal/manifest";
import type { RouteFact } from "../../src/internal/route-fact";

const authGuard = guard({ name: "auth", handler: () => new Response("denied", { status: 401 }) });
const bareDescriptor = route({
  before: [authGuard],
  params: undefined,
  query: undefined,
  handler: () => json(200, { any: true }),
});

function fixture() {
  return defineApp({
    routes: {
      "/any": bareDescriptor as never,
      "/fn": (request: Request) => new Response(`fn:${request.method}`),
      "/users/:id": {
        GET: route({ handler: () => json(200, { ok: true }) }),
        POST: route({ body: undefined, handler: () => json(201, {}) } as never),
      },
    },
    modules: [
      defineModule({ name: "billing", routes: { "/invoices": { GET: route({ handler: () => json(200, {}) }) } } }),
    ],
  });
}

describe("Manifest v1 truthfulness (M4R1-008)", () => {
  const app = fixture();
  const facts: readonly RouteFact[] = (app as unknown as { prepared: { facts: readonly RouteFact[] } }).prepared.facts;
  const records = captureRouteRecords(facts);

  test("bare route() descriptor yields exactly one '*' lugas record", () => {
    const anyRecords = records.filter((r) => r.path === "/any");
    expect(anyRecords).toHaveLength(1);
    expect(anyRecords[0]!.method).toBe("*");
    expect(anyRecords[0]!.kind).toBe("lugas");
    expect(anyRecords[0]!.guards).toEqual(["auth"]);
  });

  test("plain functions record as native handlers", () => {
    const fn = records.find((r) => r.path === "/fn");
    expect(fn?.method).toBe("*");
    expect(fn?.kind).toBe("native");
    expect(fn?.native).toBe("handler");
  });

  test("serialized methods use only ADR-sanctioned representations", () => {
    const sanctioned = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "*"]);
    const serialized = JSON.parse(serializeManifest((app as unknown as { manifest: LugasManifestV1 }).manifest));
    for (const record of serialized.routes as { method: string }[]) {
      expect(sanctioned.has(record.method)).toBe(true);
    }
  });

  test("record count equals the prepared fact set (no reclassification)", () => {
    expect(records.length).toBe(facts.length);
  });

  test("frameworkVersion is the generated constant, synced with package.json", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
    expect(app.manifest.frameworkVersion).toBe(pkg.version);
  });
});
