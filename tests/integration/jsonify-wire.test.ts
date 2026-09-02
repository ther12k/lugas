/**
 * Jsonify wire probes (M6R9, #319).
 *
 * Runtime counterparts for the compile-time `Jsonify` contract: every route
 * returns a body whose decoded client value must equal what `JSON.stringify`
 * actually put on the wire, and the brand must describe exactly that value.
 */
import { describe, expect, test } from "bun:test";
import { defineApp } from "../../src/core/app";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";
import { createClient } from "../../src/client/create-client";
import { createTestServer } from "../../src/testing";
import type { AppContract } from "../../src/core/contract";

const dropper = {
  toJSON(): undefined {
    return undefined;
  },
};

// M6R10: the hook is invoked once per serialization position; the
// replacement's own toJSON is NOT re-entered at the same position.
let innerHookCalls = 0;
const inner = {
  keep: "x",
  toJSON(): undefined {
    innerHookCalls += 1;
    return undefined;
  },
};
let outerHookCalls = 0;
const outer = {
  toJSON(): typeof inner {
    outerHookCalls += 1;
    return inner;
  },
};

// M6R10: ECMAScript passes the property key to toJSON.
const keyed = {
  toJSON(key: string): { key: string } {
    return { key };
  },
};

const app = defineApp({
  routes: {
    "/non-finite": {
      GET: route({
        handler: () => {
          // `fin` is declared with a literal type: finite literals stay exact through Jsonify.
          const body: { n: number; inf: number; negInf: number; fin: 1.5 } = {
            n: Number.NaN,
            inf: Infinity,
            negInf: -Infinity,
            fin: 1.5,
          };
          return json(200, body);
        },
      }),
    },
    "/tojson-drop-member": {
      GET: route({ handler: () => json(200, { value: dropper, keep: "yes" }) }),
    },
    "/tojson-drop-element": {
      GET: route({ handler: () => json(200, [dropper, "x"]) }),
    },
    "/hook-once": {
      GET: route({ handler: () => json(200, { value: outer, outer, key: "k" }) }),
    },
    "/keyed-hook": {
      GET: route({ handler: () => json(200, { value: keyed }) }),
    },
  },
});

type API = AppContract<typeof app>;

describe("Jsonify wire probes", () => {
  test("non-finite numbers decode as null; the brand carries number | null", async () => {
    const server = createTestServer(app, { port: 0 });
    const client = createClient<API>({ baseUrl: server.url });
    const result = await client.get("/non-finite");
    await server.stop();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data: { n: number | null; inf: number | null; negInf: number | null; fin: 1.5 } = result.data;
      expect(data.n).toBeNull();
      expect(data.inf).toBeNull();
      expect(data.negInf).toBeNull();
      expect(data.fin).toBe(1.5);
    }
  });

  test("a toJSON chain ending in undefined drops the object member", async () => {
    const server = createTestServer(app, { port: 0 });
    const client = createClient<API>({ baseUrl: server.url });
    const result = await client.get("/tojson-drop-member");
    await server.stop();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data: { value?: never; keep: string } = result.data;
      expect(data).toEqual({ keep: "yes" });
      expect(data.value).toBeUndefined();
    }
  });

  test("a toJSON chain ending in undefined substitutes null in array elements", async () => {
    const server = createTestServer(app, { port: 0 });
    const client = createClient<API>({ baseUrl: server.url });
    const result = await client.get("/tojson-drop-element");
    await server.stop();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data: (string | null)[] = result.data;
      expect(data).toEqual([null, "x"]);
    }
  });
});

describe("toJSON position semantics (M6R10)", () => {
  test("the hook runs once per position; the replacement's hook is not re-entered", async () => {
    outerHookCalls = 0;
    innerHookCalls = 0;
    const server = createTestServer(app, { port: 0 });
    const client = createClient<API>({ baseUrl: server.url });
    const result = await client.get("/hook-once");
    await server.stop();
    // One body, one stringify: the outer hook ran once at each of its three
    // positions (member "value", member "outer", root? no — root is the
    // wrapper object), and the inner hook never ran.
    expect(outerHookCalls).toBe(2);
    expect(innerHookCalls).toBe(0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data: { value: { keep: string }; outer: { keep: string }; key: string } = result.data;
      expect(data.value).toEqual({ keep: "x" });
      expect(data.outer).toEqual({ keep: "x" });
    }
  });

  test("keyed hooks receive the property key", async () => {
    const server = createTestServer(app, { port: 0 });
    const client = createClient<API>({ baseUrl: server.url });
    const result = await client.get("/keyed-hook");
    await server.stop();
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data: { value: { key: string } } = result.data;
      expect(data.value).toEqual({ key: "value" });
    }
  });

  test("a hook returning bigint throws instead of serializing", () => {
    const hookBig = { toJSON(): bigint { return 1n; } };
    expect(() => JSON.stringify({ value: hookBig })).toThrow(TypeError);
    expect(() => json(200, { value: hookBig })).toThrow(TypeError);
  });
});
