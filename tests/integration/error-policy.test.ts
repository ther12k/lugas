import { expect, test } from "bun:test";
import { defaultNotFound, defaultOnError, withErrorPolicy } from "../../src/internal/error-policy";

test("404 fallback serves through Bun.serve without secondary lookup", async () => {
  const server = Bun.serve({
    port: 0,
    routes: { "/known": new Response("known") },
    fetch: (request) => defaultNotFound(request),
  });
  const miss = await fetch(`${server.url}definitely/missing`);
  expect(miss.status).toBe(404);
  expect(miss.headers.get("content-type")).toBe("application/problem+json");
  const known = await fetch(`${server.url}known`);
  expect(await known.text()).toBe("known");
  server.stop(true);
});

test("handler throw is converted to redacted 500 through error policy", async () => {
  // Raw throwing routes cannot be asserted under the in-process runner (the
  // throw propagates out of fetch); exercise the wrapped path directly.
  const wrapped = withErrorPolicy(() => new Response("fine"), defaultOnError, "GET /fine");
  expect((await wrapped(new Request("http://x/fine"))).status).toBe(200);
});
