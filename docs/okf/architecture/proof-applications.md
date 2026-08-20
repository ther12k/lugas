---
type: Architecture Specification
title: Canonical Proof Applications and Fair Baselines
status: draft
tags:
- examples
- proof
- benchmarks
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Canonical Proof Applications and Fair Baselines

Proof applications are executable specifications, examples, security fixtures, and benchmark inputs. They are not marketing demos.

## Required applications

| Application | Purpose |
|---|---|
| `examples/basic` | Static/native routes, params, typed responses, not-found, and error policy. |
| `examples/validation` | Params/query/headers/JSON validation and malformed input behavior. |
| `examples/auth` | Named auth/role guards and context enrichment. |
| `examples/client` | Browser-safe typed client and result narrowing. |
| `examples/proof-api` | Production-shaped CRUD API combining all beta capabilities. |

## Benchmark variants

The proof API has feature-equivalent implementations:

```text
benchmarks/raw-bun/
benchmarks/lugas/
benchmarks/elysia/
```

Fairness requirements:

- same Bun version;
- same data and handler business logic;
- equivalent validation and authentication behavior;
- same response bodies, headers, status codes, compression, connection settings, and concurrency;
- no intentionally slow or non-idiomatic competitor code;
- raw source and commands included;
- results reported with environment and variance.

## In-memory domain

Use an in-memory repository for framework proof to avoid database latency hiding framework behavior. A separate real-world integration may use a database later, but it cannot replace the controlled fixture.

## Behavior matrix

The proof API includes:

- health;
- list/create/read/update/delete users;
- unique email validation;
- 401/403 guard outcomes;
- 404 domain problem;
- 409 conflict problem;
- 422 validation problem;
- 204 delete response;
- text endpoint;
- native static asset route;
- unexpected repository failure fixture;
- slow and abortable route;
- concurrent read/write test.
