---
type: Delivery Plan
title: Minimum Viable LugasJS Framework
status: draft
tags:
- mvp
- scope
- m3
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Minimum Viable LugasJS Framework

## Technical MVP boundary

The first technically useful framework is reached at **M3-GATE**, not at the first server response.

It includes:

- Bun-native route composition;
- native/static route passthrough;
- full-path named modules;
- typed response helpers and Problem Details;
- explicit services;
- optional Standard Schema validation;
- ordered typed guards and context enrichment;
- secure not-found/unexpected-error policies;
- explicit browser-safe typed fetch client;
- server/client integration and type-performance evidence.

## Why M1 alone is not the product

M1 proves the kernel but does not yet solve the repeated application problems that justify a framework: validation, auth policy, and end-to-end client types. Calling M1 an MVP would encourage premature release of a wrapper with little advantage over raw Bun.

## MVP exclusions

Manifest/CLI, polished testing export, agent docs, broad compatibility, release benchmarks, package publication, OpenAPI, WebSockets, ORM, auth product, multi-runtime, and AOT compiler are outside the technical MVP.

## MVP acceptance

- Public route syntax is singular and stable enough for examples.
- Typed client works against real server outcomes.
- 500-route type cost is accepted.
- Core/client production dependency target is met or explicitly revised.
- No custom router, hidden module scope, Proxy client, or erased-type runtime claims exist.
- M0–M3 gates pass from a clean checkout.
