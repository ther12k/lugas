---
type: Architecture Specification
title: Routing, Native Passthrough, and Descriptor Compilation
status: draft
tags:
- routing
- compilation
- native-passthrough
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Routing, Native Passthrough, and Descriptor Compilation

## Route ownership

Bun performs route selection. Lugas operates only before the server starts and inside the already selected descriptor handler.

## Route map

A root or module route map uses literal full paths:

```ts
{
  "/health": new Response("OK"),
  "/assets/*": { dir: "./public" },
  "/users/:id": {
    GET: route({ /* ... */ }),
  },
}
```

The framework must support the Bun route forms accepted by the pinned compatibility baseline. M0-006 records actual behavior for exact paths, params, wildcards, method maps, `HEAD`, `OPTIONS`, `405`, static responses, files/directories, and error handling.

## Classification

Lugas uses an internal brand/symbol to identify its descriptors. All other supported values are treated as native. Classification must not depend on brittle constructor names or serialize route values.

Unknown values fail at startup with a stable diagnostic rather than being routed through a generic fallback.

## Collision model

A collision is the same normalized method and exact source path declared more than once across root routes or modules. Lugas rejects collisions regardless of whether Bun would resolve order.

Lugas does not attempt to prove semantic overlap between `/users/:id` and `/users/*`. Bun route precedence remains authoritative. M0-006 documents precedence; diagnostics may warn about suspicious overlap later but must not invent incompatible rules.

## Path validation

Startup checks should cover:

- path starts with `/`;
- method is supported by the pinned Bun route type;
- duplicate parameter names are rejected if Bun rejects or mishandles them;
- declared params schema keys match path parameter names where schema introspection is safely available;
- when schema key introspection is impossible under Standard Schema, the mismatch is a type/conformance concern rather than false runtime certainty.

## Compilation output

Each Lugas descriptor becomes the smallest practical Bun-compatible handler. The compiler closes over:

- declared schemas and preselected validation functions;
- the already ordered guard array or specialized guard chain;
- services reference;
- route identity for diagnostics;
- application error policy reference.

It must not close over the entire mutable app configuration.

## Native behavior protection

Pass-through tests compare raw Bun and Lugas-hosted native entries. A discrepancy is a defect unless explicitly documented and accepted. Native static responses should remain static rather than being wrapped in functions, preserving Bun optimization opportunities.
