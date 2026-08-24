---
type: Architecture Decision Record
title: ADR-0017 — Manifest v1 Method Representation and Route-Record Provenance
status: proposed
tags:
- adr
- architecture
- manifest
- '0017'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-24T00:00:00+07:00'
---

# ADR-0017 — Manifest v1 Method Representation and Route-Record Provenance

## Context

An independent review of `main@391ef79` found the manifest diverging from both
the runtime and its own frozen specification:

1. The frozen v1 document restricted `routes[].method` to seven HTTP verbs,
   while the implementation typed it as `string` and emitted `"*"` for bare
   native entries — an undocumented schema divergence.
2. Bare `route()` descriptors (any-method) produced **zero** manifest records:
   record capture iterated uppercase keys only, and descriptors carry none.
3. Plain functions were documented as native `"handler"` rows but rejected by
   the runtime classifier (fixed by M4R1-004); capture and runtime disagreed.
4. Arbitrary uppercase keys could be recorded by capture while assembly would
   reject them.

M4-009 intends to freeze golden manifests. Locking goldens before these
corrections would freeze bugs into public contract.

## Decision

1. **Method representation.** `routes[].method` holds either one of the seven
   HTTP verbs (`GET POST PUT PATCH DELETE HEAD OPTIONS`) or the sentinel
   `"*"` for any-method claims. `"*"` sorts before verbs on the same path
   (existing code-unit ordering rule, unchanged).
2. **Any-method claims** are exactly: a bare `route()` descriptor, a plain
   function, a native `Response`/`BunFile` value, or a `{ dir }` entry — the
   same set composition already claims with `"*"`.
3. **Bare descriptors produce exactly one `"*"` record**, `kind: "lugas"`,
   carrying that descriptor's `validates` and `guards`. They are no longer
   invisible to inspection.
4. **Native taxonomy unchanged**: `"static" | "handler" | "directory"`; plain
   functions are `"handler"`. Opaque nested objects passed through under a
   method key (raw Bun passthroughs) record as `"static"`.
5. **Provenance — single interpreter.** Route facts are captured once, at
   classification time, inside `prepareApp()`
   (`src/internal/route-fact.ts`). The manifest module only orders, assembles,
   freezes, and serializes; it performs no classification of user values.
   Composition keeps its ownership-validation role but no longer feeds the
   manifest.
6. **Fail-closed keys.** Out-of-schema method keys cannot reach a manifest:
   `defineApp()` throws (`LUGAS_ROUTES_002/003`) during preparation, before a
   manifest exists.
7. **Framework version is a build constant**
   (`src/internal/framework-version.ts`, synced from `package.json` by
   `scripts/sync-version.ts`; repo test asserts sync). `defineApp()` performs
   no filesystem reads. Bundled-executable layouts stay correct.

## Consequences

- `docs/manifest-v1.md` is amended in place: the method union adds `"*"` and
  the field-source table names preparation-time facts as the origin.
- Consumers relying on zero-record bare descriptors will now see them;
  this is the correction, not a break — record counts become truthful.
- Golden fixtures do not yet exist; M4-009 will lock output from this
  corrected generator only.

## Status

Proposed by the M4R1-008 agent. Owner review required before or at the
M4R1-GATE (#204); M4-009 resumption depends on acceptance.
