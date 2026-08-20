---
type: Glossary
title: LugasJS Canonical Terms
status: draft
tags:
- glossary
- terminology
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Canonical Terms

| Term | Meaning |
|---|---|
| **App** | Validated composition of services, native routes, and named modules that can create a Bun server. |
| **Module** | Named container of full-path route entries. It is not a runtime scope, hidden prefix, or dependency-injection plugin. |
| **Native route entry** | A route value accepted by Bun that Lugas passes through without wrapping where possible. |
| **Lugas route descriptor** | Object created by `route()` that declares optional schemas/guards and a handler. |
| **Route compiler** | Startup-time function that converts descriptors to Bun handler functions; it is not an AOT application compiler or router. |
| **Guard** | Named ordered policy that may return context enrichment or a response to stop the route. |
| **Service** | Application-owned dependency supplied explicitly through `defineApp`. |
| **Typed response** | Native `Response` carrying erased TypeScript brand metadata for status/body inference. |
| **Problem** | RFC 9457-compatible `application/problem+json` response, optionally extended with stable `code` and `issues`. |
| **Contract** | Compile-time mapping from method/path to input and response unions. |
| **Manifest** | Runtime-verifiable route/module/guard/capability metadata; it is not the full compile-time contract. |
| **Client result** | Discriminated HTTP success/error result returned by the typed client. |
| **Transport failure** | Network, DNS, TLS, abort, or fetch-layer failure that throws rather than becoming an HTTP result. |
| **Diagnostic** | Stable framework error with code, location, explanation, and corrective hint. |
| **Gate** | Milestone issue that verifies merged evidence and blocks later milestones. |
| **Worktree task** | One GitHub issue assigned to one branch/worktree with explicit file ownership. |
| **Evidence report** | Markdown record of implementation, commands, results, limitations, and commit for one issue. |
| **Owner decision** | Irreversible or organizational choice that agents may prepare but not finalize. |
