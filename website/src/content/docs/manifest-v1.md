---
title: "lugas-manifest-v1"
description: "The frozen static route manifest schema."
---

# Runtime Manifest v1 (`lugas-manifest-v1`)

Frozen by M4-001 before any implementation exposes it publicly. This document
is the single source of truth for what the manifest contains, where every
field comes from, how output is ordered, and how the format may evolve.
Companion fixture: `tests/fixtures/manifest/expected-v1.md`.

## Schema

```ts
type LugasManifestV1 = {
  readonly format: "lugas-manifest-v1";
  readonly frameworkVersion: string;
  readonly bunCompatibility: string;
  readonly modules: ReadonlyArray<{
    readonly name: string;
    readonly routes: readonly string[];
  }>;
  readonly routes: ReadonlyArray<{
    readonly method:
      | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"
      | "*";
    readonly path: string;
    readonly module: string | null;
    readonly kind: "native" | "lugas";
    readonly native?: "static" | "handler" | "directory";
    readonly validates: ReadonlyArray<"params" | "query" | "headers" | "body">;
    readonly guards: readonly string[];
  }>;
};
```

## Provenance

Records are captured once at classification time inside `prepareApp()` and
consumed read-only by the manifest builder — one interpreter, no
reclassification ([ADR-0017](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0017-manifest-v1-method-and-provenance.md)).

## Field sources — every field names its runtime origin

| Field | Runtime source |
|---|---|
| `format` | Constant literal written by the generator. |
| `frameworkVersion` | Generated build constant (`src/internal/framework-version.ts`, synced from package.json by `scripts/sync-version.ts`). No runtime filesystem reads — amended by [ADR-0017](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0017-manifest-v1-method-and-provenance.md). |
| `bunCompatibility` | The observed `Bun.version` of the executing runtime that produced the manifest. Truthful observation, not a support claim. |
| `modules[].name` | The `name` passed to `defineModule()`; root-level (module-less) routes never appear here. |
| `modules[].routes` | Paths registered by that module, sorted per the ordering rules. |
| `routes[].method` | Uppercase literal key as declared, or `"*"` for any-method claims (bare descriptors, functions, static values, `{dir}`) — amended by [ADR-0017](https://github.com/ther12k/lugas/blob/main/docs/okf/decisions/0017-manifest-v1-method-and-provenance.md). |
| `routes[].path` | The declared route path string verbatim (params like `:id` and wildcards appear un-interpolated). |
| `routes[].module` | Owning module name, or `null` when declared at the app root. |
| `routes[].kind` | `"native"` when the entry is a bare native value (`Response`, function, `{dir}`); `"lugas"` when it is a `route()` descriptor. |
| `routes[].native` | Optional, present only on `kind: "native"` rows. Additive v1 field (M4-004): `"static"` for bare Response/Blob values, `"handler"` for plain functions, `"directory"` for `{dir}` entries. Runtime source: entry shape at composition time. Readers must ignore unknown fields per the compatibility policy. |
| `routes[].validates` | Which slots carry a Standard Schema validator on the descriptor — presence only, in canonical order. |
| `routes[].guards` | Guard names in execution order (declaration order of `before`). |

## Forbidden compile-time-only claims

The manifest MUST NOT contain:

1. Inferred TypeScript response bodies or statuses.
2. Exact handler return statuses not materialized as runtime metadata.
3. Property schemas of validators (only the fact that a slot validates).
4. Service implementation details or values.
5. Source file paths unless a future build-time tool explicitly provides them.

Violations require an ADR correction before implementation.

## Determinism

- Routes sort by `path` then `method`, both ascending by code-unit order.
- Modules sort by `name` ascending (stable across declaration orders).
- `validates` uses canonical order: `params, query, headers, body`.
- `guards` preserves execution order (semantic, never sorted).
- Key order follows the schema exactly; serialization is JSON with 2-space
  indentation and a trailing newline.
- Generation performs no network requests and starts no server; importing the
  app module must remain side-effect safe.

## Versioning and compatibility policy

- The format literal encodes the major format version (`-v1`).
- **Additive change** (new OPTIONAL field): allowed inside v1 only if
  - readers ignore unknown fields, and
  - this document records the addition with its runtime source.
  Writers targeting strict v1 consumers may omit optional fields.
- **Breaking change** (field removal, type widening/narrowing, ordering or
  semantic change): bumps the literal to `lugas-manifest-v2`; readers reject
  unknown format literals rather than guessing.
- Any implementation need that would violate the forbidden list requires an
  ADR correction referencing this document before code lands.
- Compatibility promise: for a given Lugas release and unchanged app, two
  generated manifests are byte-identical.

## Stability policy

1. This schema is frozen for M4; M4-002 implements capture exactly as
   specified here. Divergence discovered during implementation opens an ADR
   correction issue instead of editing code toward convenience.
2. Consumers (tests, CLI, agents) treat unknown route/module fields as
   non-fatal but must not present them as verified facts.
3. Deprecations require one minor release with dual emission before removal.

## Worked example (abridged)

Given:

```ts
const auth = guard({ name: "auth", handler: () => json(401, { e: 1 }) });
export default defineApp({
  modules: [
    defineModule({
      name: "billing",
      routes: {
        "/invoices/:id": { GET: route({ params: z.object({ id: z.string() }), handler }) },
      },
    }),
  ],
  routes: {
    "/ping": { GET: new Response("pong") },
    "/users": {
      POST: route({
        headers: z.object({ authorization: z.string() }),
        body: z.object({ name: z.string() }),
        before: [auth],
        handler,
      }),
    },
  },
});
```

The manifest contains (ordering applied):

```json
{
  "routes": [
    { "method": "POST", "path": "/users", "module": null, "kind": "lugas", "validates": ["headers", "body"], "guards": ["auth"] },
    { "method": "GET", "path": "/ping", "module": null, "kind": "native", "validates": [], "guards": [] }
  ],
  "modules": [{ "name": "billing", "routes": ["/invoices/:id"] }]
}
```

(Full canonical examples live in `tests/fixtures/manifest/expected-v1.md`.)
