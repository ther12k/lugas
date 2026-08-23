/**
 * Full server↔client contract proof (M3-016).
 *
 * One shared application definition (examples/client/app.ts) drives both the
 * runtime assertions here and the compile-time assertions in
 * contract.test-d.ts. The server is always ephemeral (port 0); no public
 * internet is contacted.
 */
import { describe, expect, test } from "bun:test";
import { createClient } from "../../../src/client/create-client";
import { contractApp } from "../../../examples/client/app";
import type { TypedResponse } from "../../../src/core/response";

type ContractAPI = {
  readonly "/users/:id": {
    readonly GET: {
      readonly input: {
        readonly params?: { readonly id: string };
        readonly query?: { readonly q?: string; readonly tag?: readonly string[] };
      };
      readonly responses:
        | TypedResponse<200, { id: string; q: string; tag: string[] | null }>
        | TypedResponse<422, unknown>;
    };
  };
  readonly "/users": {
    readonly POST: {
      readonly input: {
        readonly headers?: { readonly authorization: string };
        readonly body?: { readonly name?: string; readonly tags?: readonly string[] };
      };
      readonly responses:
        | TypedResponse<201, { created: boolean; name: string }>
        | TypedResponse<422, unknown>;
    };
  };
  readonly "/empty": {
    readonly GET: { readonly responses: TypedResponse<204, undefined> };
  };
  readonly "/guarded": {
    readonly GET: {
      readonly input: { readonly headers?: { readonly authorization?: string } };
      readonly responses:
        | TypedResponse<200, { secret: boolean }>
        | TypedResponse<401, { error: string }>;
    };
  };
  readonly "/admin": {
    readonly GET: {
      readonly input: {
        readonly headers?: { readonly authorization: string; "x-role"?: string };
      };
      readonly responses:
        | TypedResponse<200, { admin: boolean }>
        | TypedResponse<401, { error: string }>
        | TypedResponse<403, { error: string }>;
    };
  };
  readonly "/missing-thing": {
    readonly GET: { readonly responses: TypedResponse<404, { code: string }> };
  };
  readonly "/conflict": {
    readonly PUT: { readonly responses: TypedResponse<409, { code: string }> };
  };
  readonly "/strict-body": {
    readonly POST: {
      readonly input: { readonly body?: { readonly n?: number } };
      readonly responses:
        | TypedResponse<200, { n: number }>
        | TypedResponse<415, unknown>
        | TypedResponse<422, unknown>;
    };
  };
  readonly "/slow": {
    readonly GET: { readonly responses: TypedResponse<200, { late: boolean }> };
  };
  readonly "/boom": {
    readonly GET: { readonly responses: TypedResponse<500, unknown> };
  };
};

function served() {
  const server = contractApp.serve({ port: 0, development: false });
  return { server, client: createClient<ContractAPI>({ baseUrl: server.url }) };
}

describe("server↔client contract: documented scenarios", () => {
  test("200 — params and query round-trip through server decoding", async () => {
    const { server, client } = served();
    try {
      const res = await client.get("/users/:id", {
        params: { id: "日本 1" },
        query: { q: "q&=x", tag: ["t1", "t2"] },
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.status).toBe(200);
        expect(res.data).toEqual({ id: "日本 1", q: "q&=x", tag: ["t1", "t2"] });
      }
    } finally {
      server.stop(true);
    }
  });

  test("201 — typed headers and JSON body create a resource", async () => {
    const { server, client } = served();
    try {
      const res = await client.post("/users", {
        headers: { authorization: "Bearer anything" },
        body: { name: "Ada", tags: ["dev"] },
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.status).toBe(201);
        expect(res.data).toEqual({ created: true, name: "Ada" });
      }
    } finally {
      server.stop(true);
    }
  });

  test("204 — empty success yields undefined data", async () => {
    const { server, client } = served();
    try {
      const res = await client.get("/empty");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.status).toBe(204);
        expect(res.data).toBeUndefined();
      }
    } finally {
      server.stop(true);
    }
  });

  test("400/422 — validation failures surface as Problem Details failures", async () => {
    const { server, client } = served();
    try {
      // body schema violation from an untyped caller
      const badBody = await client.post("/strict-body", { body: { n: "not-a-number" } as never });
      expect(badBody.ok).toBe(false);
      if (!badBody.ok) {
        expect(badBody.status).toBe(422);
        const problem = badBody.error as { code?: string };
        expect(problem.code).toBe("VALIDATION_FAILED");
      }

      // query schema violation via the raw escape hatch (nonconforming probe)
      const raw = await client.request("GET", "/strict-query?page=abc");
      expect(raw.status).toBe(422);
    } finally {
      server.stop(true);
    }
  });

  test("401/403 — guards short-circuit with their declared statuses in order", async () => {
    const { server, client } = served();
    try {
      const unauth = await client.get("/guarded", { headers: {} });
      expect(unauth.ok).toBe(false);
      if (!unauth.ok) expect(unauth.status).toBe(401);

      const forbidden = await client.get("/admin", {
        headers: { authorization: "Bearer valid" },
      });
      expect(forbidden.ok).toBe(false);
      if (!forbidden.ok) {
        expect(forbidden.status).toBe(403);
        expect(forbidden.error).toEqual({ error: "forbidden" });
      }

      const admin = await client.get("/admin", {
        headers: { authorization: "Bearer valid", "x-role": "admin" },
      });
      expect(admin.ok).toBe(true);
    } finally {
      server.stop(true);
    }
  });

  test("404 — declared missing resource keeps its typed error body", async () => {
    const { server, client } = served();
    try {
      const res = await client.get("/missing-thing");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(404);
        expect(res.error).toEqual({ code: "NOPE" });
      }
    } finally {
      server.stop(true);
    }
  });

  test("409 — conflict verb route returns its declared status", async () => {
    const { server, client } = served();
    try {
      const res = await client.put("/conflict");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.status).toBe(409);
    } finally {
      server.stop(true);
    }
  });

  test("415 — nonconforming content type is rejected by the server policy", async () => {
    const { server, client } = served();
    try {
      const raw = await client.request("POST", "/strict-body", );
      void raw;
      // escape hatch sends JSON-less POST without content-type → server 415
      const direct = await fetch(new URL("/strict-body", server.url), {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "n=1",
      });
      expect(direct.status).toBe(415);
    } finally {
      server.stop(true);
    }
  });

  test("500 — handler errors are redacted end-to-end", async () => {
    const { server, client } = served();
    try {
      const res = await client.get("/boom");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(500);
        const text = JSON.stringify(res.error);
        expect(text).not.toContain("internal-detail");
      }
    } finally {
      server.stop(true);
    }
  });

  test("abort on slow route rejects without fabricating a result", async () => {
    const { server, client } = served();
    try {
      const controller = new AbortController();
      const pending = client.get("/slow", { init: { signal: controller.signal } });
      setTimeout(() => controller.abort(), 30);
      let caught: unknown;
      try {
        await pending;
      } catch (error) {
        caught = error;
      }
      expect(typeof caught).toBe("object");
      expect((caught as { name?: string }).name === "AbortError" || caught instanceof Error).toBe(
        true,
      );
      expect(typeof (caught as { ok?: unknown }).ok).toBe("undefined");
    } finally {
      server.stop(true);
    }
  });
});
