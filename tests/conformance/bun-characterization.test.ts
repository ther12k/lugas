import { expect, test } from "bun:test";

test("Bun native static route and fallback precedence", async () => {
  const server = Bun.serve({ port: 0, routes: { "/exact": new Response("exact") }, fetch: () => new Response("fallback", { status: 404 }) });
  const response = await fetch(`${server.url}exact`);
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("exact");
  server.stop(true);
});

test("server.fetch and ephemeral port work", async () => {
  const server = Bun.serve({ port: 0, fetch: () => new Response("ok") });
  expect(server.url.port).not.toBe(0);
  expect((await server.fetch(new Request(`${server.url}`))).status).toBe(200);
  server.stop(true);
});
