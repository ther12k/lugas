import { expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";

test("app.serve compiles descriptors and passes native options safely", async () => {
  const app = defineApp({
    services: { greeting: "hi" },
    routes: {
      "/hello": route({ handler: ({ services }) => new Response((services as { greeting: string }).greeting) }),
      "/static": new Response("static"),
    },
  });
  const server = app.serve({ port: 0, development: false });
  expect(server.port).not.toBe(0);
  expect(await (await fetch(`${server.url}hello`)).text()).toBe("hi");
  expect(await (await fetch(`${server.url}static`)).text()).toBe("static");
  expect((await fetch(`${server.url}missing`)).status).toBe(404);
  server.stop(true);
});

test("app-level fetch override is passed through for misses", async () => {
  const app = defineApp({ routes: { "/known": new Response("known") } });
  const server = app.serve({ port: 0, fetch: () => new Response("custom", { status: 418 }) });
  expect((await fetch(`${server.url}miss`)).status).toBe(418);
  expect(await (await fetch(`${server.url}miss`)).text()).toBe("custom");
  server.stop(true);
});

test("handler exceptions are redacted by the app error policy", async () => {
  const app = defineApp({ routes: { "/boom": route({ handler: () => { throw new Error("secret-value"); } }) } });
  const server = app.serve({ port: 0 });
  const res = await fetch(`${server.url}boom`);
  expect(res.status).toBe(500);
  expect(await res.text()).not.toContain("secret-value");
  server.stop(true);
});
