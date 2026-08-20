---
type: Product Research
title: Primary Personas and Proof Use Cases
status: draft
tags:
- personas
- use-cases
- proof
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Primary Personas and Proof Use Cases

## Persona A — Bun-first backend developer

Needs native Bun performance and APIs, but wants consistent routes, validation, errors, and tests. Rejects a broad framework because the application is small or the team wants direct runtime control.

## Persona B — Small product team using coding agents

Needs predictable source structure, narrow tasks, explicit dependencies, and machine-readable contracts. The team values reviewability over clever framework syntax.

## Persona C — Library/integration author

Needs to provide a validator, auth guard, database service, or domain module without entering a plugin inheritance system. Prefers ordinary TypeScript composition.

## Persona D — Framework maintainer

Needs a small compatibility surface, measurable type/runtime budgets, stable diagnostics, and a release process that resists feature creep.

## Required proof applications

### Basic API

- static `/health` response;
- path parameter route;
- JSON success and 404 problem;
- native file/directory route passthrough;
- custom not-found and unexpected-error policy.

### Validation API

- query with repeated keys;
- params transformation;
- JSON body validation;
- malformed JSON, unsupported media type, and validation issues;
- no parsing on a route without a body schema.

### Guarded API

- bearer/session auth stub;
- typed `actor` context enrichment;
- ordered role guard;
- 401 and 403 typed outcomes;
- unexpected auth provider failure through global error boundary.

### Typed client

- literal route/method autocomplete;
- path encoding;
- query arrays and empty values;
- JSON body and headers;
- narrowing by `result.ok` and `result.status`;
- 204, text, problem, malformed response, abort, and network failure behavior.

### Production-shaped CRUD API

- in-memory repository to isolate framework behavior;
- list, create, read, update, and delete;
- validation and auth guard;
- concurrent requests and cancellation;
- tests using `lugas/testing` and `lugas/client`;
- comparable raw Bun and Elysia fixtures for evidence, not marketing.
