import { expect, test } from "bun:test";

test("toolchain probe: Bun.serve native API typechecks and runs under pinned TS", async () => {
  const server = Bun.serve({ port: 0, fetch: () => new Response("ok") });
  const res = await server.fetch(new Request(`${server.url}x?a=1`));
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("ok");
  server.stop(true);
});
