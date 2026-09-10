---
type: Guide
title: Lugas for AI Agents
status: current
tags:
- guide
- ai
- agents
- llm
- openapi
---

# Lugas for AI agents

Lugas APIs are unusually readable for AI coding agents — not because of an integration layer, but because the framework's core artifacts are exactly what agents consume: a frozen machine-readable route manifest, generated OpenAPI 3.1, `llms.txt`, and compile-time type contracts. This guide covers what agents can read today, how to stream LLM tokens through a Lugas route, and where the MCP adapter proposal stands ([ADR-0031](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0031-mcp-adapter.md)).

## What agents can read today

| Surface | What an agent gets | How |
|---|---|---|
| `lugas-manifest-v1` | Every path, method, module, guard name, and declared validation slot — frozen JSON, no app boot required | `bunx lugas inspect ./app.ts` or `app.manifest` |
| OpenAPI 3.1 | The full operation surface: parameters, request bodies, responses, the shared ProblemDetails error component | `defineApp({ openapi })` → `GET /openapi.json` |
| Scalar UI | Human-readable rendering of the same document (agents ignore it; teammates use it) | `defineApp({ openapi: { ui: true } })` → `/docs` |
| Typed contract | Exact success/error payload shapes per status — the thing agents most often get wrong | `AppContract<typeof app>` in TypeScript |
| `llms.txt` / `llms-full.txt` | The framework's own constraints and API, formatted for LLM context windows | repo root of any Lugas project |

Practical pattern for agent-driven development: point the agent at `openapi.json` for shapes and at the [manifest](./manifest-v1.md) for routing/guard facts, and let the [typed client](./client.md) turn mistakes into compile errors instead of runtime surprises. Schema-bearing validators (Zod, Valibot with Standard JSON Schema) flow into the OpenAPI document; validators without a schema representation document presence only — the agent is never fed a guessed shape.

## Streaming LLM tokens

LLM chat completions are server→client token streams — which is exactly what [`sse()`](./sse.md) already provides, with the deterministic cleanup guarantees agents and users both need when someone closes the tab mid-generation. The recipe is an ordinary route: parse the prompt (a [Standard Schema body](./validation.md)), open the upstream model request, and pump tokens into the SSE writer. Closing the browser tab ends the stream, `writer.send` starts returning `false`, and the returned cleanup aborts the upstream request — no orphaned generations.

```ts
import { defineApp, route, sse } from "lugas";

export default defineApp({
  routes: {
    "/chat": {
      POST: route({
        handler: (ctx) => {
          const prompt = "…from your application state…";
          const abort = new AbortController();

          return sse({
            start: (writer) => {
              // Fire the async pump; start itself stays synchronous and
              // returns the cleanup that runs exactly once when the
              // stream ends (client disconnect, close(), or force-close).
              void (async () => {
                const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "content-type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "gpt-4o-mini",
                    stream: true,
                    messages: [{ role: "user", content: prompt }],
                  }),
                  signal: abort.signal,
                });

                const reader = upstream.body!.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                for (;;) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  let idx: number;
                  while ((idx = buffer.indexOf("\n")) !== -1) {
                    const line = buffer.slice(0, idx).trim();
                    buffer = buffer.slice(idx + 1);
                    if (!line.startsWith("data:")) continue;
                    const payload = line.slice(5).trim();
                    if (payload === "[DONE]") return;
                    // Forward the provider delta to the browser.
                    if (writer.send({ data: payload }) === false) return; // client gone
                  }
                }
              })();

              return () => abort.abort();
            },
          });
        },
      }),
    },
  },
});
```

Same recipe works for any SSE-shaped model backend — Ollama (`/api/chat` with `"stream": true`), Anthropic (`stream: true`), a local vLLM — the framework never sees the vendor.

Operational notes:

- **Client side**: `EventSource` is GET-only, so for `POST /chat` consume the response stream with `fetch` (`response.body.getReader()`), or expose the route as GET with the prompt in the query. The [typed client](./client.md) deliberately does not wrap streams.
- **Keys stay server-side**: the upstream authorization header is set in the handler; clients see only your SSE frames.
- **CORS applies**: `/chat` is an ordinary pipeline route, so [`defineApp({ cors })`](./cors.md) governs browser access — token endpoints are exactly where you want the fail-closed default.
- **Backpressure**: for very fast models, check `writer.desiredSize` before forwarding every delta; `send` returning `false` means the client is gone.

## MCP adapter (proposed)

[ADR-0031](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0031-mcp-adapter.md) sketches a first-party Model Context Protocol adapter — mounting a Streamable-HTTP MCP endpoint that exposes manifest operations as agent-callable tools, read-only by default, pinned to a spec version, zero dependencies. It is a **proposal awaiting owner decision**: the MCP spec is still moving, and Lugas is deliberately near its feature stop-rule. It is not implemented on `main`.

Until then, agents integrate with a Lugas API through the OpenAPI document (most agent frameworks' native input) or a thin MCP shim generated *by the application* from `openapi.json`.
