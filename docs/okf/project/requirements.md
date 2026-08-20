---
type: Requirements Specification
title: LugasJS Product and Technical Requirements
status: draft
tags:
- requirements
- functional
- non-functional
- contracts
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Product and Technical Requirements

Requirement IDs are stable and feed the [Traceability Matrix](../delivery/traceability.md).

## Functional requirements

| ID | Requirement | Priority |
|---|---|---:|
| FR-001 | Define an application from native route entries and Lugas route descriptors. | P0 |
| FR-002 | Compose named modules with full route paths and reject collisions before serving. | P0 |
| FR-003 | Compile Lugas descriptors into Bun-native route handlers without a framework router. | P0 |
| FR-004 | Provide typed native response helpers for JSON, text, empty, redirects, and Problem Details. | P0 |
| FR-005 | Declare explicit application services available to handlers and guards. | P0 |
| FR-006 | Support optional validation for params, query, headers, and JSON body through Standard Schema. | P0 |
| FR-007 | Normalize validation failures into stable RFC 9457-compatible problem responses. | P0 |
| FR-008 | Execute named guards in declaration order, allowing typed context enrichment or response short-circuit. | P0 |
| FR-009 | Infer route input and response contracts for a browser-safe client. | P0 |
| FR-010 | Expose explicit typed client methods keyed by HTTP method and literal route path. | P0 |
| FR-011 | Return discriminated HTTP results and preserve normal network/abort throwing behavior. | P0 |
| FR-012 | Expose a deterministic runtime manifest containing only runtime-verifiable data. | P1 |
| FR-013 | Provide stable startup and request diagnostics with documented error codes. | P1 |
| FR-014 | Provide Bun-native test server helpers with deterministic cleanup. | P1 |
| FR-015 | Provide optional route inspection commands after a safe-import spike. | P1 |
| FR-016 | Provide canonical examples for basic routing, validation, auth guards, and typed client use. | P1 |
| FR-017 | Provide `llms.txt`, a full agent reference, and a framework skill document. | P1 |
| FR-018 | Pass native Bun static, file, directory, wildcard, method, and error semantics through where supported. | P0 |

## Non-functional requirements

| ID | Requirement | Priority |
|---|---|---:|
| NFR-001 | Core targets zero production runtime dependencies. | P0 |
| NFR-002 | Unused parsing/validation/guard code must not run per request. | P0 |
| NFR-003 | Synchronous handlers and guards retain a synchronous fast path. | P0 |
| NFR-004 | Browser client exports must not import Bun-only modules. | P0 |
| NFR-005 | Public types remain measurable and usable at 500 routes; 1,000-route behavior must be reported. | P0 |
| NFR-006 | Internal modules remain replaceable without exposing unstable types. | P1 |
| NFR-007 | Builds, tests, benchmarks, and generated docs are reproducible from a clean checkout. | P0 |
| NFR-008 | No performance claim is accepted without feature-equivalent methodology and raw evidence. | P0 |
| NFR-009 | Errors do not disclose stack traces or secrets by default in production mode. | P0 |
| NFR-010 | Input limits and malformed-request behavior are documented and tested. | P0 |
| NFR-011 | Supported Bun versions are pinned and tested across the declared OS matrix. | P0 |
| NFR-012 | Every GitHub task has dependencies, owned files, acceptance criteria, verification, and evidence. | P0 |
| NFR-013 | Concurrent subagent tasks may not share mutable files without an explicit integrator. | P0 |
| NFR-014 | Package, repository, license, and public release actions require owner approval. | P0 |

## Contract requirements

| ID | Requirement |
|---|---|
| CR-001 | Raw `Response` remains valid but yields a conservative client contract when body/status cannot be inferred. |
| CR-002 | Typed helper brands are erased at runtime and never mutate response wire behavior. |
| CR-003 | Query decoding preserves empty strings and repeated keys; coercion belongs to the schema. |
| CR-004 | Declared JSON body parsing rejects malformed JSON and unsupported media types with stable problems. |
| CR-005 | Guard order is deterministic and observable in tests. |
| CR-006 | Module names are diagnostic identities, not runtime scopes or hidden prefixes. |
| CR-007 | Full paths remain searchable in source and appear exactly in the manifest. |
| CR-008 | Runtime manifest response metadata is absent unless explicitly materialized and verified. |
| CR-009 | HTTP non-success responses do not throw in the typed client; transport failures do. |
| CR-010 | Native Bun route precedence and automatic behavior are not reinterpreted by Lugas. |
