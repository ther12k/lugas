---
type: Architecture Specification
title: LugasJS Architecture Overview
status: draft
tags:
- architecture
- overview
- bun-native
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Architecture Overview

## System shape

```text
Application source
  ├─ native Bun route entries
  ├─ Lugas route descriptors
  ├─ optional Standard Schema validators
  ├─ named guards
  └─ explicit services
          │ startup composition
          ▼
Lugas application kernel
  ├─ validate declarations and collisions
  ├─ compile only Lugas descriptors
  ├─ preserve native route entries
  ├─ build truthful runtime manifest
  └─ install not-found/error boundaries
          │
          ▼
Bun.serve({ routes, fetch, error, ...options })
          │
          ├─ Bun router performs route selection
          └─ selected native or compiled handler executes
```

Lugas does not intercept every request through a catch-all router. It creates the route map that Bun serves.

## Layers

### 1. Declaration layer

Public helpers create frozen or readonly descriptors. They perform inexpensive local checks and preserve types. The layer contains no server and no request-specific state.

### 2. Composition layer

`defineApp` validates modules, detects duplicate method/path combinations, classifies native values, compiles Lugas descriptors, installs defaults, and constructs the manifest. This happens before serving.

### 3. Request layer

A compiled descriptor performs only work declared by that route:

```text
Bun-selected handler
  → optional input decoding/validation
  → ordered guards
  → application handler
  → native Response
```

Unexpected errors flow to one application error policy. Expected validation/auth/domain outcomes return typed responses.

### 4. Type-contract layer

TypeScript extracts route paths, methods, declared inputs, handler responses, and guard short-circuit responses. This contract powers the client and type tests. The contract is erased at runtime.

### 5. Runtime-manifest layer

A separate manifest records module names, method/path pairs, native/compiled classification, input capabilities, and guard names. It intentionally does not claim inferred response schemas or types that do not exist at runtime.

### 6. Client layer

`lugas/client` is browser-safe and uses ordinary `fetch`. It accepts the exported server application type only through TypeScript, builds a URL explicitly, serializes declared inputs, and returns a discriminated HTTP result.

## Architectural seams

- Validation executor: Standard Schema structural interface.
- Error policy: application `onError` with secure default.
- Fetch implementation: injectable in the client for testing/edge environments.
- Test server: Bun-specific helper around ephemeral server creation and cleanup.
- CLI: optional consumer of the runtime manifest after a safe-import spike.

## Invariants

- No Lugas route matching on the request path.
- No body read unless the route declares body validation or application code explicitly reads `request`.
- No guard array allocation/discovery per request after compilation.
- No server-only import reachable from `lugas/client`.
- No runtime contract field derived solely from a TypeScript conditional type.
- No module prefix or scope changes the visible source path.
