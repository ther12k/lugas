---
type: Scope Definition
title: LugasJS Scope, Boundaries, and Non-Goals
status: draft
tags:
- scope
- non-goals
- mvp
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Scope, Boundaries, and Non-Goals

## v0.1 beta scope

- Bun 1.4.x baseline and Bun-native `Bun.serve` composition.
- Named modules containing full-path route maps.
- Native route passthrough and Lugas route descriptors.
- Typed native response helpers.
- Explicit services.
- Optional Standard Schema validation for params, query, headers, and JSON bodies.
- Named ordered guards with typed context enrichment.
- Global not-found and unexpected-error policy.
- Explicit fetch-style typed client.
- Truthful runtime manifest and stable diagnostics.
- Bun testing helper and route/client integration tests.
- Inspection CLI if the safe-import spike passes.
- Canonical examples and agent documentation.
- Reproducible security, performance, typecheck, compatibility, and package evidence.

## Deliberate non-goals for v0.1

| Excluded capability | Reason |
|---|---|
| Custom router | Duplicates Bun and creates permanent hot-path ownership. |
| Node/Deno/Workers adapters | Portability conflicts with a small Bun-native product. |
| Elysia API compatibility | Would import the complexity Lugas is designed to avoid. |
| Eden dependency | Eden contracts are tied to Elysia's application type and release model. |
| Proxy/tree typed client | Attractive syntax, but unnecessary recursive types and path-property edge cases for the first release. |
| Controller decorators or reflection | Hides route ownership and complicates static inspection. |
| Dynamic plugin scopes | Introduces inheritance and context mutation rules. |
| `decorate`, `derive`, macros, or implicit DI | Multiple ways to mutate handler context undermine local reasoning. |
| Broad lifecycle hook matrix | Lugas begins with validation, ordered guards, handler, and error boundary. |
| Runtime response-schema inference | TypeScript return types do not exist at runtime. |
| Response validation | Useful but not required to prove the first contract; reconsider after client and performance evidence. |
| OpenAPI generation | Deferred until explicit runtime schema metadata exists without duplication. |
| ORM/database abstraction | Domain infrastructure remains application-owned. |
| Authentication/session product | Lugas provides guard mechanics, not security policy. |
| CORS/CSRF product | Applications can use native handlers/guards; a future helper requires separate threat review. |
| WebSocket/SSE abstraction | Bun APIs remain directly available; typing another transport expands scope sharply. |
| JSX/template/frontend framework | Lugas is an HTTP API framework. |
| AOT application compiler | Bun already routes natively; first prove startup/runtime/type needs. |
| Automatic code generation | Type-only client first; codegen is a later escape hatch if type cost demands it. |
| Hosted platform, deployment product, or telemetry service | Outside framework ownership. |

## Reconsideration rule

A non-goal may be reconsidered only when:

1. a real use case cannot be solved cleanly through native Bun or application code;
2. a focused spike compares at least two alternatives;
3. runtime, type, security, and API costs are measured;
4. the feature remains detachable or an ADR justifies core placement;
5. an owner authorizes the milestone and compatibility burden.
