---
type: Architecture Specification
title: Standard Schema Input Validation
status: draft
tags:
- schema
- validation
- standard-schema
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Standard Schema Input Validation

## Goal

Support validator libraries through the Standard Schema v1 structural contract without making a validator a core dependency or inventing a Lugas schema language.

## Supported inputs

### Params

Bun supplies path params as strings. When a params schema is declared, Lugas validates the object and uses the schema's transformed output.

### Query

Lugas creates a deterministic object from `URLSearchParams`:

- one occurrence → string;
- repeated occurrences → array of strings in source order;
- `?flag=` → empty string;
- missing key → omitted;
- no implicit number, boolean, date, CSV, or JSON coercion.

Coercion and defaults belong to the chosen schema.

### Headers

When declared, Lugas projects request headers into a lower-case-key object. Repeated/header-combination behavior follows the web `Headers` representation and is documented in conformance tests. Sensitive values must not appear in validation logs.

### Body

Initial structured body support is JSON only.

- A declared body schema requires a JSON-compatible media type.
- Unsupported media type returns 415 Problem Details.
- Malformed JSON returns 400 Problem Details.
- Schema failure returns 422 Problem Details.
- A bodyless request is validated as the parser result defined by tests; schemas decide whether absence is valid.
- Body streams are read once.

Routes may use native `request.formData()`, text, bytes, or streams when no body schema is declared. Structured FormData support is deferred.

## Validation executor

The internal executor calls the Standard Schema method and handles synchronous or asynchronous results. It normalizes only the outer success/failure shape; validator-specific issue fields are preserved under a safe `issues` extension where serializable.

## Problem response

```json
{
  "type": "https://lugasjs.dev/problems/validation",
  "title": "Request validation failed",
  "status": 422,
  "code": "VALIDATION_FAILED",
  "issues": []
}
```

The final type URI is provisional until a domain exists; beta may use `about:blank` plus stable `code` to avoid claiming an unowned URL.

## Runtime metadata limits

Standard Schema does not guarantee runtime JSON Schema introspection. The manifest may report that a route validates `body` or `query`, and may identify a validator when safely available, but must not claim property-level schemas unless an explicit metadata feature is added.

## Security limits

- Bun/application body-size limits are authoritative.
- Never include raw body, authorization, cookie, or secret values in diagnostics.
- Avoid catastrophic recursive normalization of hostile issue objects; cap depth/count for serialized problem output.
- Async validators must observe cancellation where their library supports it.
