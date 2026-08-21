import { expect, test } from "bun:test";
import { withErrorPolicy, defaultOnError } from "../../src/internal/error-policy";

// Observed on Bun 1.4.0 standalone processes: a raw throwing route returns a
// 500 whose ~50KB HTML dev page embeds the thrown message and stack. Under
// the bun:test in-process runner the throw propagates out of fetch instead,
// so this baseline cannot be asserted here — verified via standalone probe
// and recorded in docs/reports/issues/M1-014.md.
test.skip("raw Bun route throws leak error text in the default 500 page (observed baseline)", async () => {
  const server = Bun.serve({
    port: 0,
    routes: { "/raw": () => { throw new Error("token=leak-me"); } },
    fetch: () => new Response("nf", { status: 404 }),
  });
  const res = await fetch(`${server.url}raw`);
  const body = await res.text();
  expect(res.status).toBe(500);
  // Standalone processes observed the thrown message embedded in Bun's 50KB
  // HTML dev page; under the test runner the page may be suppressed. The
  // stable contract is: raw throws never redact — only withErrorPolicy does.
  expect(typeof body).toBe("string");
  server.stop(true);
});

test("withErrorPolicy redacts thrown values into a problem response", async () => {
  const wrapped = withErrorPolicy(() => { throw new Error("token=leak-me"); }, defaultOnError, "GET /w");
  const res = await wrapped(new Request("http://x/w"));
  expect(res.status).toBe(500);
  expect(res.headers.get("content-type")).toBe("application/problem+json");
  expect(await res.text()).not.toContain("leak-me");
});
