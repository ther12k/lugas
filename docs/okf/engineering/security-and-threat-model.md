---
type: Security Standard
title: Security Model and Threat Assessment
status: draft
tags:
- security
- threat-model
- redaction
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Security Model and Threat Assessment

## Trust model

Lugas executes trusted application code. It is not a sandbox. Requests, URLs, headers, params, query values, and bodies are untrusted. Schemas and guards are application-selected trusted code but may fail or behave asynchronously.

## Assets

- confidentiality of credentials, cookies, headers, request bodies, environment, and services;
- integrity of route/guard declarations and authorization flow;
- availability under malformed or oversized input;
- correctness of client URL construction and response parsing;
- supply-chain integrity of package artifacts.

## Threats and controls

### Route confusion

**Threat:** duplicate routes, hidden prefixes, precedence assumptions, or native/descriptor mismatch.

**Controls:** full paths, duplicate method/path startup rejection, raw Bun characterization, native conformance tests, truthful manifest.

### Authorization bypass

**Threat:** guard not executed, wrong order, enrichment collision, response ignored, exception treated as continuation.

**Controls:** ordered compiled guards, response short-circuit, no `undefined` continuation, negative tests proving handler non-execution, stable guard identity.

### Body and parser denial of service

**Threat:** oversized body, malformed JSON, slow stream, repeated input, expensive issue serialization.

**Controls:** native body limits, parse only when declared, abort propagation, bounded issue count/depth, stress tests. Lugas does not promise protection beyond configured limits.

### Sensitive diagnostics

**Threat:** stack, body, auth header, cookie, services, validator values, or environment leaks.

**Controls:** production-safe default problems, redaction, unknown-error normalization, security tests, application-owned server logging.

### Query/header ambiguity

**Threat:** repeated values, case normalization, prototype-like keys, delimiter coercion, authorization confusion.

**Controls:** deterministic query arrays, lower-case header projection, no implicit coercion, null-prototype objects where useful, schema validation, conformance tests.

### Client path/query injection

**Threat:** path param changes path structure, query double encoding, untrusted base URL, header conflict.

**Controls:** segment encoding, URL API, deterministic serializer, method/path constraints, explicit base URL, tests for Unicode and reserved characters.

### Directory/file serving

**Threat:** path traversal or unintended files.

**Controls:** use Bun native directory route behavior; never reimplement path normalization; conformance/security tests; document application responsibility for directory selection.

### Error type confusion

**Threat:** malformed server response parsed as trusted typed body.

**Controls:** content-type-aware parser, decode failure semantics, original Response retention, no blind cast presented as validation.

### Supply chain

**Threat:** compromised dependencies, publish token, tarball contents, provenance gaps.

**Controls:** zero runtime dependency target, pinned lockfile, audit/SBOM, package whitelist, checksums/provenance, owner-controlled publication.

## Out of scope

Lugas does not implement authentication, CSRF tokens, CORS policy, rate limiting, WAF, TLS policy, secret management, database authorization, or tenant isolation. Applications must supply these where required.

## Security release gate

No beta with open P0/P1 security findings. Unexecuted platform tests are reported as gaps, not passes.
