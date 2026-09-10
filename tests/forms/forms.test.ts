/**
 * Multipart form tests (M9-005, ADR-0030).
 *
 * Covers: fields/files on ctx.body with native File values, repeated names
 * last-wins, 415 on wrong media type, 400 MALFORMED_MULTIPART on garbage,
 * 413 BODY_BUDGET_EXCEEDED (Content-Length pre-read and streamed overrun),
 * each form limit (413 FORM_LIMIT_EXCEEDED), route budget composition,
 * manifest capability, and LUGAS_FORM_001.
 */
import { describe, expect, test } from "bun:test";
import { defineApp, form, json, route } from "../../src/index";
import { createTestServer } from "../../src/testing";

function multipartBody(parts: Array<{ name: string; filename?: string; value: string }>): { body: string; contentType: string } {
  const boundary = "----lugastest" + Math.random().toString(36).slice(2);
  const segments = parts.map((p) => {
    const headers = p.filename !== undefined
      ? `Content-Disposition: form-data; name="${p.name}"; filename="${p.filename}"\r\nContent-Type: application/octet-stream`
      : `Content-Disposition: form-data; name="${p.name}"`;
    return `--${boundary}\r\n${headers}\r\n\r\n${p.value}\r\n`;
  });
  return {
    body: segments.join("") + `--${boundary}--\r\n`,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function post(server: { url: string }, path: string, body: { body: string; contentType: string }): Promise<Response> {
  return fetch(`${server.url}${path}`, {
    method: "POST",
    headers: { "content-type": body.contentType },
    body: body.body,
  });
}

function uploadApp(bodySchema: ReturnType<typeof form>, extra?: { bodyBudget?: number }) {
  return defineApp({
    ...(extra?.bodyBudget !== undefined ? { bodyBudget: extra.bodyBudget } : {}),
    routes: {
      "/upload": {
        POST: route({
          body: bodySchema,
          handler: (ctx) =>
            json(200, {
              fields: ctx.body.fields,
              files: Object.fromEntries(Object.entries(ctx.body.files).map(([k, f]) => [k, { name: f.name, size: f.size }])),
            }),
        }),
      },
    },
  });
}

describe("form() config validation", () => {
  test("LUGAS_FORM_001 on invalid limits", () => {
    for (const bad of [{ maxFields: 0 }, { maxFiles: -1 }, { maxFileSize: 1.5 }, { nope: 1 } as never, "x" as never]) {
      try {
        form(bad as never);
        expect.unreachable();
      } catch (err) {
        expect((err as { code?: string }).code).toBe("LUGAS_FORM_001");
      }
    }
  });

  test("defaults apply when omitted", () => {
    expect(() => form()).not.toThrow();
  });
});

describe("parsing over a real server", () => {
  test("text fields and file parts land on ctx.body with native File values", async () => {
    const server = createTestServer(
      uploadApp(form({ maxFileSize: 1024 })),
    );
    try {
      const res = await post(server, "/upload", multipartBody([
        { name: "note", value: "hello" },
        { name: "doc", filename: "a.txt", value: "file-content" },
      ]));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { fields: Record<string, string>; files: Record<string, { name: string; size: number }> };
      expect(body.fields).toEqual({ note: "hello" });
      expect(body.files["doc"]).toEqual({ name: "a.txt", size: "file-content".length });
    } finally {
      await server.stop();
    }
  });

  test("repeated part names collapse last-wins", async () => {
    const server = createTestServer(uploadApp(form()));
    try {
      const res = await post(server, "/upload", multipartBody([
        { name: "tag", value: "one" },
        { name: "tag", value: "two" },
      ]));
      expect(res.status).toBe(200);
      expect(((await res.json()) as { fields: Record<string, string> }).fields).toEqual({ tag: "two" });
    } finally {
      await server.stop();
    }
  });

  test("415 on a non-multipart content type", async () => {
    const server = createTestServer(uploadApp(form()));
    try {
      const res = await fetch(`${server.url}/upload`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      expect(res.status).toBe(415);
      expect(((await res.json()) as { code: string }).code).toBe("UNSUPPORTED_MEDIA_TYPE");
    } finally {
      await server.stop();
    }
  });

  test("400 MALFORMED_MULTIPART on garbage body", async () => {
    const server = createTestServer(uploadApp(form()));
    try {
      const res = await fetch(`${server.url}/upload`, {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=zzz" },
        body: "not a multipart body at all",
      });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("MALFORMED_MULTIPART");
    } finally {
      await server.stop();
    }
  });

  test("413 FORM_LIMIT_EXCEEDED per limit: fields, files, file size", async () => {
    const limitApp = defineApp({
      routes: {
        "/fields": {
          POST: route({
            body: form({ maxFields: 2 }),
            handler: (ctx) => json(200, { fields: ctx.body.fields }),
          }),
        },
        "/files": {
          POST: route({
            body: form({ maxFiles: 1, maxFileSize: 4 }),
            handler: (ctx) => json(200, { files: Object.keys(ctx.body.files) }),
          }),
        },
      },
    });
    const server = createTestServer(limitApp);
    try {
      const fields = await post(server, "/fields", multipartBody([
        { name: "a", value: "1" },
        { name: "b", value: "2" },
        { name: "c", value: "3" },
      ]));
      expect(fields.status).toBe(413);
      expect(((await fields.json()) as { code: string }).code).toBe("FORM_LIMIT_EXCEEDED");

      const fileCount = await post(server, "/files", multipartBody([
        { name: "f1", filename: "x", value: "aa" },
        { name: "f2", filename: "y", value: "bb" },
      ]));
      expect(fileCount.status).toBe(413);
      expect(((await fileCount.json()) as { code: string }).code).toBe("FORM_LIMIT_EXCEEDED");

      const fileSize = await post(server, "/files", multipartBody([
        { name: "f1", filename: "big", value: "way-too-large-content" },
      ]));
      expect(fileSize.status).toBe(413);
      expect(((await fileSize.json()) as { code: string }).code).toBe("FORM_LIMIT_EXCEEDED");
    } finally {
      await server.stop();
    }
  });
});

describe("budget composition", () => {
  test("Content-Length over the app bodyBudget is refused pre-read (413 BODY_BUDGET_EXCEEDED)", async () => {
    const server = createTestServer(uploadApp(form(), { bodyBudget: 64 }));
    try {
      const res = await post(server, "/upload", multipartBody([{ name: "big", value: "x".repeat(1024) }]));
      expect(res.status).toBe(413);
      expect(((await res.json()) as { code: string }).code).toBe("BODY_BUDGET_EXCEEDED");
    } finally {
      await server.stop();
    }
  });

  test("route budget overrides the app default for multipart routes", async () => {
    const app = defineApp({
      bodyBudget: 64,
      routes: {
        "/upload": {
          POST: route({
            body: form({ maxFileSize: 2048 }),
            budget: 4096,
            handler: (ctx) => json(200, { size: (ctx.body.files["doc"] as File).size }),
          }),
        },
      },
    });
    const server = createTestServer(app);
    try {
      const res = await post(server, "/upload", multipartBody([
        { name: "doc", filename: "a.bin", value: "y".repeat(1024) },
      ]));
      expect(res.status).toBe(200);
      expect(((await res.json()) as { size: number }).size).toBe(1024);
    } finally {
      await server.stop();
    }
  });

  test("manifest records the body capability for form() routes", () => {
    const app = uploadApp(form());
    const routeFact = (app.manifest.routes as unknown as ReadonlyArray<{ path: string; validates?: string[] }>).find((r) => r.path === "/upload");
    expect(routeFact?.validates).toContain("body");
  });
});
