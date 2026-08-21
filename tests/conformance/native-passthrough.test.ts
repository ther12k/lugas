import { expect, test } from "bun:test";

test("static Response route values pass through Bun.serve natively", async () => {
  const server = Bun.serve({ port: 0, routes: { "/native": new Response("passthrough") }, fetch: () => new Response("miss", { status: 404 }) });
  const res = await fetch(`${server.url}native`);
  expect(await res.text()).toBe("passthrough");
  server.stop(true);
});

test("native method-map routes are preserved by Bun", async () => {
  const server = Bun.serve({
    port: 0,
    routes: { "/mapped": { GET: new Response("get-ok") } },
    fetch: () => new Response("miss", { status: 404 }),
  });
  const res = await fetch(`${server.url}mapped`);
  expect(await res.text()).toBe("get-ok");
  server.stop(true);
});
