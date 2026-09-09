/**
 * M8-004 — OpenAPI 3.1 generation and Scalar reference UI tests (ADR-0025).
 */
import { afterAll, describe, expect, test } from "bun:test";
import { defineApp, json, route } from "../../src";

const servers: Array<ReturnType<ReturnType<typeof defineApp>["serve"]>> = [];
afterAll(() => {
  for (const server of servers) server.stop(true);
});

function start(config: Parameters<typeof defineApp>[0]): { url: string; server: ReturnType<ReturnType<typeof defineApp>["serve"]> } {
  const server = defineApp(config).serve({ port: 0, development: false });
  servers.push(server);
  return { url: new URL(server.url).origin, server };
}

describe("M8-004 OpenAPI generation and serving", () => {
  test("generates and serves canonical OpenAPI 3.1 JSON document", async () => {
    const { url } = start({
      openapi: {
        document: {
          title: "Test Service",
          version: "1.0.0",
          description: "Integration test API",
        },
      },
      routes: {
        "/items/:id": {
          GET: route({
            openapi: {
              summary: "Get item by ID",
              operationId: "getItem",
              tags: ["Items"],
            },
            handler: (ctx) => json(200, { id: ctx.params }),
          }),
        },
      },
    });

    const res = await fetch(`${url}/openapi.json`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const doc = await res.json() as Record<string, any>;
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info.title).toBe("Test Service");
    expect(doc.info.version).toBe("1.0.0");
    expect(doc.paths["/items/{id}"]).toBeDefined();
    expect(doc.paths["/items/{id}"].get).toBeDefined();
    expect(doc.paths["/items/{id}"].get.summary).toBe("Get item by ID");
    expect(doc.paths["/items/{id}"].get.operationId).toBe("getItem");
    expect(doc.paths["/items/{id}"].get.tags).toEqual(["Items"]);
    expect(doc.paths["/items/{id}"].get.parameters.length).toBe(1);
    expect(doc.paths["/items/{id}"].get.parameters[0].name).toBe("id");
    expect(doc.paths["/items/{id}"].get.parameters[0].in).toBe("path");
    expect(doc.paths["/items/{id}"].get.responses["200"]).toBeDefined();
    expect(doc.components.schemas.ProblemDetails).toBeDefined();
  });

  test("serves Scalar UI referencing document path", async () => {
    const { url } = start({
      openapi: {
        document: {
          title: "Docs API",
          version: "2.0.0",
        },
        ui: true, // defaults to /docs
      },
      routes: {
        "/ping": { GET: () => new Response("pong") },
      },
    });

    const res = await fetch(`${url}/docs`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const html = await res.text();
    expect(html).toContain("<title>Docs API</title>");
    expect(html).toContain('data-url="/openapi.json"');
    expect(html).toContain("https://cdn.jsdelivr.net/npm/@scalar/api-reference");
  });

  test("custom openapi and ui paths", async () => {
    const { url } = start({
      openapi: {
        document: { title: "Custom Paths", version: "0.1.0" },
        path: "/custom-spec.json",
        ui: { path: "/reference" },
      },
      routes: {
        "/ok": { GET: () => new Response("ok") },
      },
    });

    const docRes = await fetch(`${url}/custom-spec.json`);
    expect(docRes.status).toBe(200);

    const uiRes = await fetch(`${url}/reference`);
    expect(uiRes.status).toBe(200);
    const html = await uiRes.text();
    expect(html).toContain('data-url="/custom-spec.json"');
  });

  test("feature detection of Standard JSON Schema vs presence-only", async () => {
    const standardWithSchema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (v: unknown) => ({ value: v }),
        jsonSchema: () => ({
          type: "object",
          properties: {
            title: { type: "string" },
          },
          required: ["title"],
        }),
      },
    };

    const presenceOnlySchema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (v: unknown) => ({ value: v }),
      },
    };

    const { url } = start({
      openapi: {
        document: { title: "Schema Test", version: "1.0.0" },
      },
      routes: {
        "/articles": {
          POST: route({
            body: standardWithSchema,
            handler: () => json(201, { ok: true }),
          }),
        },
        "/search": {
          GET: route({
            query: presenceOnlySchema,
            handler: () => json(200, []),
          }),
        },
      },
    });

    const res = await fetch(`${url}/openapi.json`);
    const doc = await res.json() as Record<string, any>;

    // Article body has full JSON schema from feature detection
    const bodySchema = doc.paths["/articles"].post.requestBody.content["application/json"].schema;
    expect(bodySchema.type).toBe("object");
    expect(bodySchema.properties.title.type).toBe("string");

    // Search query has presence-only fallback
    const queryParam = doc.paths["/search"].get.parameters.find((p: any) => p.in === "query");
    expect(queryParam).toBeDefined();
    expect(queryParam.name).toBe("query");
    expect(queryParam.description).toBe("Declared query parameters");
  });
});
