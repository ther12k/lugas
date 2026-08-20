---
type: Engineering Standard
title: Testing Strategy and Test Pyramid
status: draft
tags:
- testing
- integration
- conformance
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Testing Strategy and Test Pyramid

## Test layers

### Unit tests

Cover descriptors, response helpers, query serialization, validation normalization, diagnostics, contract utility types, and client parsing in isolation.

### Integration tests

Run a compiled app through a real Bun server/test server. Cover services, validation, guards, handlers, fallback, error policy, and client-server behavior.

### Native conformance tests

Run the same fixture against raw Bun and Lugas pass-through/composed routes. Detect changed routing, params, methods, static responses, files/directories, and fallback behavior.

### Type tests

Use compile-pass/compile-fail fixtures or a type assertion tool. Test valid paths, invalid methods, required inputs, guard enrichment, response narrowing, raw-response widening, and browser import boundaries.

### Security tests

Cover malformed URL encoding, oversized/repeated query keys, malicious headers, malformed JSON, prototype-like keys, issue serialization limits, error redaction, path traversal through native directory routes, and abort behavior.

### Stress tests

Concurrent sync/async routes, guards, validators, aborted requests, 10,000 routes, repeated test server lifecycle, and typecheck fixtures.

## Required test properties

- Deterministic and independent.
- No fixed public ports unless isolated.
- Cleanup in `finally`/disposal.
- Exact response status, media type, body, and relevant headers.
- Negative assertions that forbidden handlers/guards were not executed.
- No sleeps where a deterministic signal can be used.
- Tests fail on unhandled rejections and leaked resources where Bun supports detection.

## Coverage

Line/branch coverage is informative, not the sole gate. Contract and conformance matrices matter more. Critical paths—classification, collision detection, validation, guard short-circuit, error redaction, client URL building—require explicit branch tests.
