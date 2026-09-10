---
type: Owner Decision Record
title: 'ODR-0012: M9-003 Dispatch — WebSockets with Typed Upgrade Guards and Shutdown Semantics'
status: accepted
tags:
- owner-decision
- m9
- websockets
---

# ODR-0012: M9-003 Dispatch — WebSockets with Typed Upgrade Guards and Shutdown Semantics

## Context

The M9-002 cookie battery is merged on green `main` (`2d665bb`), and
`lugas@0.1.0-beta.3` is published under npm `beta`. Per the owner-directed
post-beta.2 sequence (ODR-0010), item (b) is WebSockets — the bidirectional
companion to the shipped SSE battery — on Bun's native `Bun.serve()`
WebSocket surface, with typed upgrade guards and shutdown semantics.
Applications can upgrade sockets through a raw `fetch` today, so a first-party
surface is justified only by what raw `fetch` cannot express: the compiled
pipeline (guards, schema slots, traffic gate, error policy) deciding the
upgrade, and deterministic lifecycle behavior for open sockets.
[ADR-0028](../okf/decisions/0028-websockets.md) fixes the contract.

## Decision

1. **M9-003 ([#366](https://github.com/ther12k/lugas/issues/366)) is
   dispatched** under ADR-0028: a `websocket(config)` route value kind whose
   upgrade decision runs through the ordinary compiled pipeline — `before`
   guards short-circuit the handshake with real HTTP responses, schema slots
   validate before the upgrade, the ADR-0020 traffic gate holds upgrades
   during init — and whose handlers receive Bun's native `ServerWebSocket`
   unwrapped plus the descriptor-derived context. `lugasLifecycle.shutdown()`
   closes open sockets with `1001 Going Away` before the drain. Non-upgrade
   requests get `426 Upgrade Required`.
2. **Sequence confirmation:** after M9-003, the next battery remains (c)
   secure headers and health/readiness helpers, then (d) multipart, OTel
   hooks, compression/ETag, and the rate-limit contract — each requiring its
   own issue, ADR, and ODR before implementation starts.
3. **Protected-file authority (this issue only):** M9-003 may edit
   `src/index.ts` (protected) for the additive `websocket` export and
   `WebSocketConfig` type line, plus `src/internal/serve.ts`,
   `src/internal/classify-route.ts`, `src/internal/prepared-app.ts`, and
   `src/internal/lifecycle.ts` as *adjacent owned-by-this-issue* files (the
   WebSocket hub requires serve-time wiring; all changes additive,
   existing behavior unchanged and covered by the full suite).
   `package.json` and `bun.lock` must remain **untouched** (no dependencies —
   WebSockets are part of Bun itself); `src/client/index.ts`,
   `src/testing/index.ts`, `tsconfig*.json`, and workflows remain untouched.
   Diagnostics goldens regenerate via `scripts/update-goldens.ts --apply`
   with the reason recorded in the evidence report.

## Effect

- The M9-003 worktree may be created from a green base containing this
  record (`docs/m9-003-governance` merge).
- On completion with full evidence, the roadmap's WebSockets row flips to
  shipped-on-`main`, and `docs/websockets.md` joins the synced site pages.
- npm publication, dist-tag moves, and any new release candidate remain
  owner-controlled actions.
