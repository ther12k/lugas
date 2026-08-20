---
type: Reference
title: Standard Schema v1 — Validation Interoperability
status: stable
tags:
- reference
- standard-schema
- validation
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Standard Schema v1 — Validation Interoperability

**Official source:** https://standardschema.dev/  
**Retrieved:** 2026-08-21

Standard Schema defines a shared TypeScript interface that validation libraries can implement. Lugas uses the structural validation/result contract and does not assume JSON Schema introspection, property enumeration, coercion policy, or issue fields beyond what the standard guarantees.

## Implementation questions for M2

- type-only structural declaration versus dependency on a specification package;
- synchronous and asynchronous validation results;
- transformed output inference;
- safe normalization of issue arrays;
- conformance fixtures for multiple libraries;
- license/attribution requirements.

Standard Schema support does not imply that every validator behaves identically. Lugas documents only its input decoding and outer failure mapping.
