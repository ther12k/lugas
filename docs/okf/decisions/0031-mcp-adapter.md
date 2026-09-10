---
type: Architecture Decision Record
title: 'ADR-0031 — Model Context Protocol Adapter (Proposed)'
status: proposed
tags:
- adr
- architecture
- mcp
- ai
- '0031'
generated:
  by: zcode/glm
  at: '2026-09-10T00:00:00+07:00'
---

# ADR-0031 — Model Context Protocol Adapter (Proposed)

## Status

**Proposed — awaiting owner decision.** Sketched 2026-09-10 in response to the owner's question about LLM support. Not dispatched; no ODR exists; nothing is implemented on `main`. Deliberately parked until the ODR-0010 item-(d) batteries close (owner stop-rule). If declined, this ADR closes as rejected with the reasoning recorded; if accepted after item (d), an ODR dispatches it with the pinned spec version confirmed.

## Context

The owner asked about "LLM support." The assessment (2026-09-10): Lugas APIs are already agent-consumable through shipped artifacts — generated OpenAPI 3.1 ([ADR-0025]), the frozen `lugas-manifest-v1` ([ADR-0017]), `llms.txt`, and typed contracts — and LLM token streaming is already served by `sse()` ([ADR-0023], recipe in `docs/ai-agents.md`). An LLM/SDK integration layer (model clients, agent runtimes) is out of scope by the ODR-0010 standing non-goals pattern.

One surface remained genuinely framework-shaped: the **Model Context Protocol (MCP)** — the JSON-RPC-based protocol through which agents discover and call tools. MCP is a protocol, not a vendor SDK (the CORS comparison, not the OpenAI comparison). An API owner today bridges the gap with a hand-written MCP server that re-declares every route's schema — a duplicate surface that drifts from the Lugas manifest exactly the way hand-written OpenAPI used to before [ADR-0025].

The counter-pressures: the MCP specification is young and moving (transport and auth documents have changed repeatedly in 2025); Lugas is deliberately near its feature stop-rule; and a protocol adapter is a real audit surface. This ADR therefore proposes a small, pinned, fail-closed adapter and explicitly schedules the decision *after* item (d) — it does not displace the remaining batteries.

## Proposed decision (pending acceptance)

1. **Optional subpath `lugas/mcp`** exposing a **Streamable-HTTP MCP endpoint** mounted via `defineApp({ mcp: { path?: "/mcp" } })`. No stdio transport (Lugas serves HTTP); no SDK dependency — the JSON-RPC envelope and the handful of MCP methods (`initialize`, `tools/list`, `tools/call`, ping) are implementable against the platform in a few hundred dependency-free lines.
2. **Tools are generated from route facts** — the same single interpreter as the manifest and OpenAPI ([ADR-0017]/[ADR-0025] pattern): one tool per operation, arguments derived from declared Standard Schemas (feature-detected; presence-only without a schema representation — never a guessed shape), responses described from the contract. Hand-edited tool definitions are not merged; drift is impossible by construction.
3. **Read-only by default:** only idempotent-read operations (`GET`/`HEAD` routes) become tools unless the application explicitly opts specific routes in (`mcp: { allow: ["/ invoices:POST", …] }`). Mirrors the CORS fail-closed stance: agents can read unless the application says otherwise.
4. **Spec-version pinning:** the adapter negotiates the MCP protocol version it was built against and fails closed (`LUGAS_MCP_002`) on incompatible `protocolVersion` offers rather than best-effort guessing. Upgrading MCP is a deliberate Lugas release action, never silent.
5. **Auth is application-owned:** MCP authentication/authorization composes through ordinary guards on the mounted endpoint (bearer/session guard before the JSON-RPC handler). Lugas adds no identity surface (ODR-0010 non-goals).
6. **Diagnostics:** `LUGAS_MCP_001` (invalid mcp configuration), `LUGAS_MCP_002` (protocol-version negotiation failure) — catalogued.
7. **Packaging:** additive subpath export; zero production dependencies; `package.json` untouched beyond the export map.

## Consequences (if accepted)

- Positive: agents call a Lugas API natively with zero duplicate schema surface; the manifest→tools pipeline is the same trusted interpreter.
- Positive: read-only default + version pinning keep the blast radius small while the spec churns.
- Cost/tradeoff: pinning means deliberate upgrades — new MCP capabilities arrive late, by release.
- Cost/tradeoff: Streamable-HTTP only; stdio MCP users run a proxy or the application adds it by amendment.
- Compatibility effect: one additive subpath; nothing existing changes.

## Alternatives considered

- **Model-client integration (`lugas/ai` wrapping OpenAI/Anthropic SDKs):** rejected — vendor-churning product surface; the ODR-0010 non-goals pattern; unnecessary (handlers call models with `fetch`; the streaming recipe is documentation).
- **Docs-only recipe, no adapter:** accepted *for now* (`docs/ai-agents.md`); insufficient long-term if MCP becomes the agent integration standard — the hand-written shim drifts exactly like hand-written OpenAPI did.
- **Codegen CLI emitting a standalone MCP server from `openapi.json`:** viable alternative — aligns with "no runtime proxies," keeps the API server untouched. Cost: a build artifact to keep fresh, a second deployable, and no guard/manifest guarantees at runtime. Revisit if the owner prefers out-of-process integration.
- **Accepting now, in parallel with item (d):** rejected — the stop-rule exists precisely to finish the planned batteries before adding surfaces; this ADR is queued behind them by design.

## Evidence

None yet — proposal stage. On acceptance, implementation issue + ODR would follow with behavior tests (protocol negotiation, tools/list shape from manifest facts, read-only default, guard composition) and `docs/mcp.md`.

## Revisit trigger

Owner decision on this ADR after item (d) closes. Material changes to the MCP specification (new transport/auth model) before acceptance should be reflected in an amended sketch rather than accepted-as-written.
