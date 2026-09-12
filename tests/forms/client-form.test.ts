/**
 * End-to-end multipart through the typed client (RF-3 roadmap item 3).
 * Acceptance example: send three files under one field name, receive all
 * three (preserve mode), keep last-wins as the untouched default, enforce
 * part/byte limits, and reject through the typed failure branches.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { createTestServer } from "../../src/testing";
import { createClient } from "../../src/client/create-client";
import { formBody } from "../../src/client/index";
import { defineApp, form, json, route } from "../../src/index";
import type { AppContract } from "../../src/core/contract";

const app = defineApp({
  routes: {
    "/upload": {
      POST: route({
        body: form({ repeated: "preserve", maxFileSize: 64 }),
        handler: (ctx) =>
          json(201, {
            note: ctx.body.fields.note,
            fileNames: Object.values(ctx.body.files).map((f) => f.name),
            groupSizes: Object.fromEntries(Object.entries(ctx.body.groups).map(([k, v]) => [k, v.length])),
            lastFileName: ctx.body.files.files?.name,
            firstGroupKind: ctx.body.groups.files?.[0] instanceof File ? "file" : "string",
          }),
      }),
    },
    "/upload-last": {
      POST: route({
        body: form(),
        handler: (ctx) =>
          json(201, {
            note: ctx.body.fields.note,
            fileName: ctx.body.files.files?.name,
          }),
      }),
    },
  },
});
type API = AppContract<typeof app>;

const file = (name: string, bytes: number): File => new File([new Uint8Array(bytes)], name, { type: "application/octet-stream" });

describe("typed-client multipart", () => {
  const server = createTestServer(app);
  afterAll(() => server.stop());

  test("three files under one field name arrive as three groups; last-wins view kept", async () => {
    const client = createClient<API>({ baseUrl: server.url });
    const res = await client.post("/upload", {
      body: formBody({
        note: "hello",
        files: [file("a.bin", 4), file("b.bin", 4), file("c.bin", 4)],
      }),
    });
    if (!res.ok) throw new Error(`expected success, got ${res.status}`);
    expect(res.status).toBe(201);
    expect(res.data.note).toBe("hello");
    expect(res.data.groupSizes).toEqual({ note: 1, files: 3 });
    expect(res.data.fileNames).toEqual(["c.bin"]); // fields/files stay last-wins
    expect(res.data.lastFileName).toBe("c.bin");
    expect(res.data.firstGroupKind).toBe("file");
  });

  test("default form() keeps the documented last-wins contract unchanged", async () => {
    const client = createClient<API>({ baseUrl: server.url });
    const res = await client.post("/upload-last", {
      body: formBody({ note: "x", files: [file("a.bin", 2), file("b.bin", 2)] }),
    });
    if (!res.ok) throw new Error(`expected success, got ${res.status}`);
    expect(res.data).toEqual({ note: "x", fileName: "b.bin" });
  });

  test("oversized file rejects through the typed 413 FORM_LIMIT_EXCEEDED branch", async () => {
    const client = createClient<API>({ baseUrl: server.url });
    const res = await client.post("/upload", {
      body: formBody({ files: [file("big.bin", 128)] }), // maxFileSize: 64
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(413);
      // Lugas-level 413s carry the Problem body — narrowed before field access.
      expect(res.error?.code).toBe("FORM_LIMIT_EXCEEDED");
    }
  });

  test("transport-ceiling 413 arrives with NO payload; the type forces narrowing (CA-7)", async () => {
    // Same typed route, but Bun's maxRequestBodySize rejects before the
    // framework sees the body: bare 413, empty body, no Problem document.
    const raw = app.serve({ port: 0, development: false, maxRequestBodySize: 16 });
    try {
      const client = createClient<API>({ baseUrl: raw.url });
      const res = await client.post("/upload", {
        body: formBody({ files: [file("big.bin", 128)] }),
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(413);
        expect(res.error).toBeUndefined(); // decoder never manufactures a body
      }
    } finally {
      raw.stop(true);
    }
  });

  test("non-multipart content type answers 415; malformed multipart body answers 400", async () => {
    const raw = app.serve({ port: 0, development: false });
    try {
      const wrong415 = await fetch(`${raw.url}/upload`, { method: "POST", headers: { "content-type": "text/plain" }, body: "x" });
      expect(wrong415.status).toBe(415);
      expect(((await wrong415.json()) as { code: string }).code).toBe("UNSUPPORTED_MEDIA_TYPE");

      const malformed400 = await fetch(`${raw.url}/upload`, {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=deadbeef" },
        body: "not-a-multipart-body",
      });
      expect(malformed400.status).toBe(400);
      expect(((await malformed400.json()) as { code: string }).code).toBe("MALFORMED_MULTIPART");
    } finally {
      raw.stop(true);
    }
  });

  test("caller cancellation is preserved (platform signal semantics)", async () => {
    const client = createClient<API>({ baseUrl: server.url });
    const controller = new AbortController();
    controller.abort();
    await expect(
      client.post("/upload", { body: formBody({ note: "x" }), init: { signal: controller.signal } }),
    ).rejects.toThrow();
  });
});
