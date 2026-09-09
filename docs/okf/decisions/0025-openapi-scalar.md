---
type: Architecture Decision Record
title: ADR-0025 — OpenAPI 3.1 Document Generation with an Opt-In Scalar Presentation Layer
status: accepted
tags:
- adr
- architecture
- openapi
- scalar
- documentation
- '0025'
generated:
  by: zcode/glm
  at: '2026-09-09T00:00:00+07:00'
---

# ADR-0025 — OpenAPI 3.1 Document Generation with an Opt-In Scalar Presentation Layer

## Status

Accepted by owner decision (ODR-0009, `docs/owner-decisions/m8-003-dispatch.md`, 2026-09-09), dispatching issue M8-004 immediately after M8-003. Fulfills the roadmap rows "OpenAPI 3.1" and "Scalar API reference". Required an ADR per the architecture rules ("No OpenAPI without ADR").

## Context

The route contract already exists at definition time — paths, methods, declared validation schemas, guards — and is snapshotted once into the prepared graph. An OpenAPI 3.1 document can be **generated** from those facts plus explicit metadata, giving typed consumers and API explorers a machine-readable contract without a second source of truth. Two honesty constraints from the roadmap carry over:

1. Standard Schema v1 validation does **not** guarantee runtime schema introspection: a validator exposes a JSON Schema representation only if its vendor ships one. Guessing is forbidden.
2. Scalar is a presentation layer, never the contract; the OpenAPI JSON is canonical and must be usable independently.

## Decision

Lugas ships **generation-first OpenAPI 3.1** with an optional Scalar page:

1. **Configuration:** `defineApp({ openapi })` — `document` (required: at minimum `title` and `version` for the OpenAPI `info` object), `path` (default `/openapi.json`), and optional `ui: { path }` (default `/docs` when present) serving a Scalar reference page that loads the generated document. Both endpoints are framework-compiled handlers: they participate in CORS, access logging, and lifecycle exactly like any route, and are recorded in the manifest as ordinary route facts.
2. **Generation sources, in priority order:** (a) the prepared graph facts — paths, methods, module provenance; (b) a new optional `route({ openapi })` metadata block — `operationId`, `summary`, `description`, `tags`, `deprecated`, and explicit JSON Schema objects for `params`/`query`/`headers`/`body`/`responses`; (c) **feature-detected** Standard JSON Schema: if a declared validator exposes the Standard JSON Schema interface (`"jsonSchema" in schema["~standard"]`), it is used; otherwise the route's declared schemas produce **presence-only** documentation (parameter requiredness from the schema's declared position) and never a guessed shape.
3. **Defaults:** every operation documents the RFC 9457 Problem Details response component (the framework's real error envelope) as the error response; responses not explicitly declared default to `200` with no body schema rather than an invented one; the `servers` entry is **not** auto-detected (the document is origin-neutral unless the app supplies `document.servers`).
4. **Ownership and conflicts:** the OpenAPI/Scalar paths are declared like any route — overlap with an existing API route, asset path, or each other is rejected at startup with stable diagnostics; absent `openapi` config means no endpoints, no files, nothing.
5. **Scalar is explicit and replaceable:** the UI page is a generated HTML shell that loads Scalar from its public CDN build — zero package dependencies (`package.json`/`bun.lock` untouched); the document path is the only coupling; production exposure of the UI is the application's explicit choice (the roadmap's development-default guidance).
6. **Frozen surfaces respected:** `lugas-manifest-v1` schema is unchanged (endpoints appear as ordinary route facts); the OpenAPI metadata block is additive to `route()` config with its own validation diagnostics; no `any` is introduced at public boundaries.

## Consequences

- Positive: a machine-readable contract generated from the single source of truth; typed consumers and explorers stop drifting from the implementation.
- Positive: zero dependencies; Scalar is an opt-in HTML shell over the canonical JSON.
- Cost/tradeoff: schema documentation is only as good as the explicit metadata or the vendor's Standard JSON Schema support — validators without a representation document structure, not shapes (roadmap-accepted).
- Cost/tradeoff: `route()` config grows one optional metadata block; it is inert unless `defineApp` also enables `openapi`.
- Compatibility effect: protected-file changes (type exports; no dependency changes) owned by the single M8-004 issue per ODR-0009.

## Alternatives considered

- Vendor-specific JSON Schema extraction (e.g. calling Zod's `toJSONSchema` when the vendor string matches): rejected — vendor detection violates neutrality; the feature-detect keeps any conforming implementation first-class.
- Codegen/CLI-first OpenAPI (generate at build time): deferred — runtime generation from the prepared graph needs no build step; a build-time emitter can be added later from the same facts.
- Shipping `@scalar/*` as a dependency: rejected for 0.x — supply-chain and dependency surface for a presentation layer; the CDN shell keeps the package zero-dependency.

## Evidence

Implementation issue M8-004 delivers: document-shape tests (paths/methods from facts, explicit metadata, presence-only fallback, Problem Details component), serving tests (JSON at the configured path under CORS/access/lifecycle), conflict diagnostics, and the Scalar shell test (page references the document path). Evidence report `docs/reports/issues/M8-004.md`.

## Revisit trigger

If Standard JSON Schema reaches spec maturity with wide vendor adoption, the feature-detect becomes the primary path and presence-only documentation recedes. Build-time document emission may be added for apps that want the file in CI.
