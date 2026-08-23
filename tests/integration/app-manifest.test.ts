/**
 * App manifest exposure tests (M4-004).
 *
 * Reading the manifest must never start a server or execute a handler,
 * mutation must fail by type and have no runtime effect, and equal
 * declarations must serialize byte-stably. Fixture A from
 * `tests/fixtures/manifest/expected-v1.md` is reproduced exactly.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { defineApp, guard } from "../../src/index";
import { defineModule } from "../../src/core/module";
import { route } from "../../src/core/route";
import { json, text } from "../../src/core/response";
import { z } from "zod";
import { serializeManifest } from "../../src/internal/manifest";

const auth = guard({
  name: "auth",
  handler: () => json(401, { error: "x" }),
});
const tenant = guard({
  name: "tenant",
  handler: () => json(403, { error: "y" }),
});

function fixtureA() {
  return defineApp({
    modules: [
      defineModule({
        name: "billing",
        routes: {
          "/invoices/:id": {
            GET: route({
              params: z.object({ id: z.string() }),
              query: z.object({ format: z.string().optional() }),
              handler: () => json(200, { ok: true }),
            }),
            DELETE: route({
              params: z.object({ id: z.string() }),
              before: [auth],
              handler: () => new Response(null, { status: 204 }),
            }),
          },
        },
      }),
    ],
    routes: {
      "/users": {
        POST: route({
          headers: z.object({ authorization: z.string() }),
          body: z.object({ name: z.string(), tags: z.array(z.string()).optional() }),
          before: [auth, tenant],
          handler: () => json(201, { created: true }),
        }),
        GET: route({ handler: () => text(200, "list") }),
      },
      "/health": { GET: new Response("ok") },
    },
  });
}

describe("app manifest exposure", () => {
  test("reading manifest starts no server and executes no handler", async () => {
    let handled = false;
    const app = defineApp({
      routes: {
        "/tracked": {
          GET: route({
            handler: () => {
              handled = true;
              return new Response("x");
            },
          }),
        },
      },
    });
    for (let i = 0; i < 3; i++) {
      void app.manifest;
      JSON.stringify(app.manifest);
      serializeManifest(app.manifest);
    }
    expect(handled).toBe(false);
  });

  test("mutation fails by type and cannot affect internal state", async () => {
    const app = fixtureA();
    const mutable = app.manifest as { format?: string };
    expect(() => {
      "use strict";
      mutable.format = "tampered";
    }).toThrow();
    expect((app.manifest as { format: string }).format).toBe("lugas-manifest-v1");
    expect(Object.isFrozen(app.manifest)).toBe(true);
    expect(Object.isFrozen(app.manifest.routes)).toBe(true);
    expect(Object.isFrozen(app.manifest.modules)).toBe(true);
    for (const row of app.manifest.routes) {
      expect(Object.isFrozen(row)).toBe(true);
    }
  });

  test("fixture A reproduces the frozen expected-v1 document byte-for-byte", () => {
    const app = fixtureA();
    const expected = `{
  "format": "lugas-manifest-v1",
  "frameworkVersion": "${pkgVersion}",
  "bunCompatibility": "bun@${Bun.version}",
  "modules": [
    {
      "name": "billing",
      "routes": [
        "/invoices/:id"
      ]
    }
  ],
  "routes": [
    {
      "method": "GET",
      "path": "/health",
      "module": null,
      "kind": "native",
      "native": "static",
      "validates": [],
      "guards": []
    },
    {
      "method": "DELETE",
      "path": "/invoices/:id",
      "module": "billing",
      "kind": "lugas",
      "validates": [
        "params"
      ],
      "guards": [
        "auth"
      ]
    },
    {
      "method": "GET",
      "path": "/invoices/:id",
      "module": "billing",
      "kind": "lugas",
      "validates": [
        "params",
        "query"
      ],
      "guards": []
    },
    {
      "method": "GET",
      "path": "/users",
      "module": null,
      "kind": "lugas",
      "validates": [],
      "guards": []
    },
    {
      "method": "POST",
      "path": "/users",
      "module": null,
      "kind": "lugas",
      "validates": [
        "headers",
        "body"
      ],
      "guards": [
        "auth",
        "tenant"
      ]
    }
  ]
}
`;
    expect(serializeManifest(app.manifest)).toBe(expected);
  });

  test("repeated equal definitions produce byte-stable JSON", () => {
    const a = serializeManifest(fixtureA().manifest);
    const b = serializeManifest(fixtureA().manifest);
    expect(a).toBe(b);
    expect(a.endsWith("\n")).toBe(true);
  });

  test("format version is present on every manifest", () => {
    const bare = defineApp({});
    expect(bare.manifest.format).toBe("lugas-manifest-v1");
    expect(typeof bare.manifest.frameworkVersion).toBe("string");
    expect(bare.manifest.bunCompatibility.startsWith("bun@")).toBe(true);
  });
});

const pkgVersion = (
  JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;
