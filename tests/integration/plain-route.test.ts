import { expect, test } from "bun:test";
import { compileRoute } from "../../src/internal/compile-route";
import { route } from "../../src/core/route";

test("compiled descriptor serves through Bun.serve end-to-end", async () => {
  const services = { greeting: "hello" };
  const descriptor = route({
    handler: (ctx) => new Response(`${(ctx.services as typeof services).greeting} world`),
  }) as never;
  const compiled = compileRoute("GET /hello", descriptor, services);
  const server = Bun.serve({
    port: 0,
    routes: { "/hello": compiled.handler },
    fetch: () => new Response("miss", { status: 404 }),
  });
  const res = await fetch(`${server.url}hello`);
  expect(await res.text()).toBe("hello world");
  server.stop(true);
});
