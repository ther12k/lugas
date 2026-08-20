---
type: Architecture Specification
title: Named Modules and Collision-Safe Composition
status: draft
tags:
- modules
- composition
- organization
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Named Modules and Collision-Safe Composition

## Module purpose

A module organizes routes and diagnostics:

```ts
const users = defineModule<Services>({
  name: "users",
  routes: {
    "/users": { GET: route(/* ... */) },
    "/users/:id": { GET: route(/* ... */) },
  },
});
```

## What a module is not

A module is not:

- a hidden path prefix;
- a lifecycle scope;
- a dependency injection container;
- a dynamic plugin;
- a context decorator;
- a runtime middleware registry;
- an independent server.

## Full paths

Every route path is written in full. This adds a few characters but makes code search, manifest comparison, client contract extraction, and agent review substantially clearer.

A later helper may mechanically prepend a prefix at definition time only if the resulting full path is still visible in generated diagnostics/manifests and the source clarity cost is accepted. It is not part of v0.1.

## Composition

`defineApp` merges root routes and modules. Module order must not determine collision winners; duplicates are fatal. Guard execution order is local to each route, not module order.

## Module identity

Names:

- must be non-empty and stable;
- appear in diagnostics and manifest;
- should use lower-case kebab-case;
- must be unique per application;
- do not affect URL or type contract.

## Cross-module reuse

Schemas, guards, services, and ordinary functions may be imported across modules. Lugas imposes no artificial isolation. Domain ownership and circular dependency rules belong to application architecture.

## Native route entries

Modules may contain supported native Bun entries as well as descriptors. The manifest classifies each. A static response must not be wrapped merely because it sits inside a module.
