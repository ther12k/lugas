---
type: Source Register
title: LugasJS External Source Register
status: stable
tags:
- sources
- provenance
- bun
- elysia
- standards
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS External Source Register

The design uses primary sources for current runtime/framework contracts. Access date: **2026-08-21**.

| ID | Source | Role in the design |
|---|---|---|
| SRC-BUN-14 | https://bun.sh/blog/bun-v1.4 | Bun 1.4 runtime/release baseline and current production context |
| SRC-BUN-SERVER | https://bun.sh/docs/runtime/http/server | Native `Bun.serve`, server lifecycle, error, reload, and testing semantics |
| SRC-BUN-ROUTING | https://bun.sh/docs/runtime/http/routing | Native route tables, methods, parameters, wildcard, static response, file, and directory behavior |
| SRC-ELYSIA-20 | https://elysiajs.com/blog/elysia-20 | Elysia 2 simplification, modularity, error, type, and performance lessons |
| SRC-EDEN-TREATY | https://elysiajs.com/eden/treaty/overview | End-to-end contract capability reference |
| SRC-EDEN-FETCH | https://elysiajs.com/eden/fetch | Explicit fetch-style client and large-route type-performance reference |
| SRC-STANDARD-SCHEMA | https://github.com/standard-schema/standard-schema | Vendor-neutral validation interface and types |
| SRC-RFC-9457 | https://www.rfc-editor.org/rfc/rfc9457.html | HTTP Problem Details wire-format authority |

## Source-use policy

- Current behavior MUST be rechecked during M0 against pinned versions rather than assumed from this design packet.
- Bun and Elysia documentation are design inputs, not proof that Lugas implements or outperforms anything.
- Benchmarks use feature-equivalent local fixtures and retain raw evidence.
- External source wording is paraphrased; implementation agents should consult the primary source for exact contracts and licenses.
