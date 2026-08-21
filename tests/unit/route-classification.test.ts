import { describe, expect, test } from "bun:test";
import { classifyRoute } from "../../src/internal/classify-route";
import { route } from "../../src/core/route";

describe("classifyRoute()", () => {
  test("classifies route() descriptors", () => {
    const descriptor = route({ handler: () => new Response("ok") });
    expect(classifyRoute(descriptor).kind).toBe("lugas-descriptor");
  });

  test("classifies static Response values", () => {
    expect(classifyRoute(new Response("x")).kind).toBe("native-response");
  });

  test("classifies Bun.file values", () => {
    expect(classifyRoute(Bun.file("package.json")).kind).toBe("native-file");
  });

  test("classifies directory entries", () => {
    expect(classifyRoute({ dir: "./public" }).kind).toBe("native-dir");
  });

  test("classifies native method maps", () => {
    const handler = () => new Response("m");
    expect(classifyRoute({ GET: handler, POST: handler }).kind).toBe("native-method-map");
  });

  test("fails closed on unknown shapes", () => {
    expect(classifyRoute(42).kind).toBe("unsupported");
    expect(classifyRoute(null).kind).toBe("unsupported");
    expect(classifyRoute(() => new Response()).kind).toBe("unsupported");
    expect(classifyRoute({ WHAT: 1 }).kind).toBe("unsupported");
    expect(classifyRoute({ handler: "not-fn" }).kind).toBe("unsupported");
  });
});
