---
type: Architecture Specification
title: Truthful Runtime Manifest and Inspection
status: draft
tags:
- manifest
- inspection
- cli
- runtime-truth
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Truthful Runtime Manifest and Inspection

## Purpose

Give humans, tests, CLIs, and coding agents a deterministic view of the application actually composed at runtime.

## Proposed schema

```ts
type LugasManifest = {
  readonly format: "lugas-manifest-v1";
  readonly frameworkVersion: string;
  readonly bunCompatibility: string;
  readonly modules: readonly {
    name: string;
    routes: readonly string[];
  }[];
  readonly routes: readonly {
    method: string;
    path: string;
    module: string | null;
    kind: "native" | "lugas";
    validates: readonly ("params" | "query" | "headers" | "body")[];
    guards: readonly string[];
  }[];
};
```

Exact fields are frozen by M4-001 after implementation evidence.

## Truthfulness rule

The manifest may report only runtime-verifiable facts. In v0.1 it must not claim:

- inferred TypeScript response body shapes;
- exact handler return statuses unless explicitly materialized as runtime metadata;
- JSON Schema properties from a generic Standard Schema validator;
- service implementation details;
- source file paths unless a build-time tool explicitly provides them.

## Determinism

- Routes sort by path then method for serialized output.
- Modules sort by declaration order or stable name; the policy is documented and tested.
- Arrays and property order remain stable across runs on the same release.
- Manifest generation performs no request and starts no server.

## CLI

Proposed commands after the safe-import spike:

```bash
lugas routes ./src/app.ts
lugas inspect ./src/app.ts --json
```

The CLI must import the app without calling `serve`, avoid hanging handles, report module side effects clearly, and exit deterministically. If safe import cannot be guaranteed without an application convention, the CLI may require an explicit manifest-export file instead of hidden execution.

## Security

Inspection output must not include service values, secrets, headers, environment variables, schema default values, or handler source. Application import side effects are a documented risk reviewed in M4-010.
