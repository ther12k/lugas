---
type: Architecture Specification
title: Package Layout and Export Boundaries
status: draft
tags:
- packaging
- exports
- dependencies
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Package Layout and Export Boundaries

## One package first

Preferred package layout:

```text
lugas
├─ .                 server core
├─ ./client          browser-safe typed client
├─ ./testing         Bun-only test helpers
└─ ./package.json    package metadata export when useful
```

A CLI binary may ship from the same package after M4.

## Proposed source layout

```text
src/
  index.ts
  core/
    app.ts
    module.ts
    route.ts
    guard.ts
    response.ts
    types.ts
  internal/
    compile.ts
    classify.ts
    diagnostics.ts
    validation.ts
    manifest.ts
  client/
    index.ts
    create-client.ts
    serialize.ts
    parse.ts
    types.ts
  testing/
    index.ts
    test-server.ts
  cli/
    main.ts
```

The actual layout is frozen by M0/M1 evidence. Internal paths are not exported.

## Export map goals

- ESM-first and Bun-native.
- Type declarations map correctly for every subpath.
- `lugas/client` has no runtime edge to `bun` or server modules.
- Tree shaking removes unused response helpers/client features.
- Source maps and declaration maps are considered for maintainers but measured for package size.
- Package files whitelist excludes benchmarks, worktrees, raw reports, and secrets while including license/readme/type declarations.

## Dependency policy

Core targets zero production dependencies. Development dependencies may include TypeScript, validator libraries for conformance, benchmark tools, and documentation tooling, all pinned through Bun's lockfile.

Use structural Standard Schema types when license and type compatibility permit. If a tiny spec package is required, M2-001 must document why the zero-dependency target changes.

## Package name

`lugas` is proposed but not reserved. The export design must work identically under a scoped fallback. Do not hard-code an unowned website or package URL into runtime problem types before M6 owner decisions.
