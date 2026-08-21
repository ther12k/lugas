import { expect, test } from "bun:test";
import { createContext } from "../../src/internal/context";

test("base context preserves service object identity and params", () => {
  const services = { marker: { value: 1 } };
  const request = new Request("http://x/items/42");
  const context = createContext(request, services, { id: "42" });
  expect(context.request).toBe(request);
  expect(context.services).toBe(services);
  expect(context.params).toEqual({ id: "42" });
});
