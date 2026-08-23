/**
 * Shared fixtures for the M3 client adversarial matrix (M3-015).
 *
 * Deterministic by construction: every transport is an injected stub; no
 * public internet is contacted anywhere.
 */
import { createClient } from "../../src/client/create-client";
import type { TypedResponse } from "../../src/core/response";

export type MatrixAPI = {
  readonly "/m/:id": {
    readonly GET: {
      readonly input: {
        readonly params?: { readonly id: string };
        readonly query?: { readonly q?: string; readonly tag?: readonly string[] };
      };
      readonly responses: TypedResponse<200, { id: string }>;
    };
    readonly POST: {
      readonly input: {
        readonly params?: { readonly id: string };
        readonly headers?: { readonly authorization: string; "content-type"?: string };
        readonly body?: { readonly name?: string };
      };
      readonly responses: TypedResponse<201, { created: boolean }>;
    };
  };
  readonly "/plain": {
    readonly GET: {
      readonly responses:
        | TypedResponse<200, { ok: boolean }>
        | TypedResponse<503, { nope: boolean }>;
    };
  };
};

export type CapturedRequest = {
  url: string;
  method: string | undefined;
  headerEntries: Array<[string, string]>;
  bodyText: string | undefined;
  signal: AbortSignal | null | undefined;
};

export function recordingClient() {
  const captured: CapturedRequest[] = [];
  const client = createClient<MatrixAPI>({
    baseUrl: "https://matrix.test/api",
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      captured.push({
        url: String(input),
        method: init?.method,
        headerEntries: [...headers.entries()].sort(([a], [b]) => (a < b ? -1 : 1)),
        bodyText: typeof init?.body === "string" ? (init.body as string) : undefined,
        signal: init?.signal ?? null,
      });
      return new Response(JSON.stringify({ id: "x", ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch,
  });
  return { client, captured };
}
