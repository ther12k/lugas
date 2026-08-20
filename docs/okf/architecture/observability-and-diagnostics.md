---
type: Architecture Specification
title: Diagnostics and Observability Boundaries
status: draft
tags:
- diagnostics
- observability
- errors
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Diagnostics and Observability Boundaries

## Stable diagnostics

Developer/configuration failures use stable codes:

```text
LUGAS_ROUTE_001  invalid route path
LUGAS_ROUTE_002  duplicate method/path
LUGAS_ROUTE_003  unsupported route value
LUGAS_MODULE_001 duplicate module name
LUGAS_GUARD_001  duplicate or invalid guard name
LUGAS_SCHEMA_001 invalid Standard Schema object
LUGAS_SERVER_001 caller attempted to override owned server option
LUGAS_CLIENT_001 missing path parameter
LUGAS_CLIENT_002 response decode failure
```

The final catalog is owned by M4-005. Codes are compatibility-sensitive after beta.

A diagnostic includes:

- code;
- concise message;
- method/path/module where relevant;
- cause without secret values;
- corrective hint;
- optional documentation reference.

## Logging boundary

Lugas does not ship a logging backend or global logger. Unexpected-error policy may receive an internal normalized error and route identity so applications can log through their own service.

Framework defaults may use `console.error` only in development and must redact request bodies, authorization, cookies, and service objects.

## Request IDs

No mandatory request-ID allocation exists in core. Applications can add a guard or service. A future helper must remain optional and standards-compatible.

## Metrics and tracing

No built-in metrics exporter or tracing SDK. Benchmarks may expose internal counters under test-only imports, but production core must not carry dormant observability dependencies.

## Validation diagnostics

Client-visible validation problems include bounded, serializable issue information. Server logs may include richer issue metadata under application policy, but never raw secret-bearing inputs by default.

## Error correlation

The default unexpected-error response may include a random or monotonic diagnostic ID only if generation cost and information leakage are reviewed. It must not imply distributed trace support.
