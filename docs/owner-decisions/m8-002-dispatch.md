---
type: Owner Decision Record
title: 'ODR-0008: M8-002 Dispatch — Server-Sent Events Response Helper'
status: accepted
tags:
- owner-decision
- m8
- sse
- streaming
---

# ODR-0008: M8-002 Dispatch — Server-Sent Events Response Helper

## Context

M8-001 (CORS, PR #348) landed with complete evidence. On 2026-09-09 the owner
selected the next battery in the recommended sequence: **Server-Sent Events**,
whose roadmap gate on lifecycle evidence was satisfied by M7-004
([ADR-0020](../okf/decisions/0020-application-service-lifecycle.md)). This
record authorizes the second milestone-8 issue.

## Decision

1. **M8-002 ([#349](https://github.com/ther12k/lugas/issues/349)) is
   dispatched** for implementation under
   [ADR-0023](../okf/decisions/0023-server-sent-events-helper.md): the
   `sse({ start, heartbeatMs? })` streaming response helper, `SseWriter`
   contract (`send`/`comment`/`retry`/`close`/`desiredSize`), exported pure
   serializer (`formatSseEvent`), exactly-once cleanup across
   close/disconnect/force-close, and stable diagnostics
   (`LUGAS_SSE_001`/`LUGAS_SSE_002`).
2. **Protected-file authority:** M8-002 owns **runtime value exports** in
   `src/index.ts` (`sse`, `formatSseEvent`, plus the `SseConfig`, `SseWriter`,
   and event-input types). `package.json`, `bun.lock`, `src/client/index.ts`,
   `src/testing/index.ts`, `tsconfig*.json`, and workflows are untouched.
3. **Boundaries unchanged:** Bun's router stays authoritative — no new route
   kinds, no manifest facts; `lugas/client` gains no SSE consumer (the
   browser's `EventSource` is the client); no broker/fan-out/replay scope; no
   later-battery work (OpenAPI, logging, Drizzle) is started from this issue.
4. **Composition evidence required:** the evidence report must demonstrate,
   not assume, the ADR-0022 header pairing and the ADR-0020 drain interaction
   (open stream as in-flight work; force-close cleanup).

## Effect

- The M8-002 worktree may be created from a green base containing this record
  and ADR-0023.
- On completion with full evidence, the roadmap row "Server-Sent Events"
  flips to shipped-on-`main`; remaining batteries stay planned.
