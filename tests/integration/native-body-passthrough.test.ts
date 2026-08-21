import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json, text } from "../../src/core/response";

describe("Native body pass-through on undeclared-body routes", () => {
  test("native text, arrayBuffer, and formData methods remain fully available", async () => {
    const app = defineApp({
      routes: {
        "/raw-text": {
          POST: route({
            handler: async ({ request }) => {
              expect(request.bodyUsed).toBe(false);
              const raw = await request.text();
              return text(200, `echo:${raw}`);
            },
          }),
        },
        "/raw-buffer": {
          POST: route({
            handler: async ({ request }) => {
              expect(request.bodyUsed).toBe(false);
              const buf = await request.arrayBuffer();
              return json(200, { byteLength: buf.byteLength });
            },
          }),
        },
        "/raw-form": {
          POST: route({
            handler: async ({ request }) => {
              expect(request.bodyUsed).toBe(false);
              const form = await request.formData();
              return json(200, { title: form.get("title") });
            },
          }),
        },
      },
    });

    const server = app.serve({ port: 0 });
    const port = server.port;

    try {
      // 1. Raw text
      const textRes = await fetch(`http://localhost:${port}/raw-text`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "Hello Native Stream",
      });
      expect(textRes.status).toBe(200);
      expect(await textRes.text()).toBe("echo:Hello Native Stream");

      // 2. Raw ArrayBuffer
      const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const bufRes = await fetch(`http://localhost:${port}/raw-buffer`, {
        method: "POST",
        body: bytes,
      });
      expect(bufRes.status).toBe(200);
      const bufData = await bufRes.json();
      expect(bufData).toEqual({ byteLength: 8 });

      // 3. Raw FormData
      const formData = new FormData();
      formData.set("title", "Lugas Framework");
      const formRes = await fetch(`http://localhost:${port}/raw-form`, {
        method: "POST",
        body: formData,
      });
      expect(formRes.status).toBe(200);
      const formDataJson = await formRes.json();
      expect(formDataJson).toEqual({ title: "Lugas Framework" });
    } finally {
      server.stop();
    }
  });

  test("stream reading works directly on request.body", async () => {
    const app = defineApp({
      routes: {
        "/stream": {
          POST: route({
            handler: async ({ request }) => {
              expect(request.bodyUsed).toBe(false);
              let totalBytes = 0;
              if (request.body) {
                const reader = request.body.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  totalBytes += value.length;
                }
              }
              return json(200, { totalBytes });
            },
          }),
        },
      },
    });

    const server = app.serve({ port: 0 });
    const port = server.port;

    try {
      const payload = "chunk-1,chunk-2,chunk-3";
      const res = await fetch(`http://localhost:${port}/stream`, {
        method: "POST",
        body: payload,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({ totalBytes: payload.length });
    } finally {
      server.stop();
    }
  });
});
