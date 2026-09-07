---
type: Architecture Decision Record
title: ADR-0020 — Application Service Lifecycle with Drain-Ordered Shutdown
status: accepted
tags:
- adr
- architecture
- lifecycle
- '0020'
generated:
  by: zcode/glm
  at: '2026-09-07T00:00:00+07:00'
---

# ADR-0020 — Application Service Lifecycle with Drain-Ordered Shutdown

## Status

Accepted by owner decision (ODR-0003, `docs/owner-decisions/colorjoy-adr-approvals.md`, 2026-09-07), with the acceptance interpretation that an unsuccessful shutdown must not become permission to dispose resources still in use. Structurally compatible with [ADR-0007](0007-minimal-request-lifecycle.md), which remains the boundary for per-request hooks. SSE production-readiness claims stay gated on this lifecycle's evidence.

## Context

Applications own long-lived resources — database handles, timers, stream producers — that outlive individual requests. Lugas defines no contract for initializing or disposing them, so applications hand-roll signal handlers and cleanup, with no defined relationship between shutdown and requests still using those resources. Existing evidence covers only parts of the problem: `docs/reports/m4-test-lifecycle.md` proves stop-during-in-flight produces no fabricated success and releases the port, and `docs/reports/m5-cancellation.md` records that Bun cancels the connection but the framework does not cancel handler work. Bun exposes the needed mechanisms (`server.stop()` graceful and `server.stop(true)` forceful); the missing piece is the Lugas-level coordination contract, not the server lifecycle itself.

ADR-0007 fixed the **request pipeline** lifecycle (validation → guards → handler → one error boundary) and deliberately deferred request hook families. That decision is unaffected here: this ADR concerns **application services**, a different axis from per-request hooks.

## Decision

Lugas adds an application-service lifecycle, orthogonal to the request pipeline. The lifecycle distinguishes four concerns that must not be conflated, because Bun's stop contracts cover only the first of them: **connection draining** (`server.stop()` resolves when connections have shut down; `server.stop(true)` terminates active connections), **tracked application tasks** (application-owned asynchronous work known to the framework), **cooperative cancellation** (opt-in notification to work that supports it), and **resource disposal** (service handles such as SQLite connections). Closed network connections are not sufficient evidence that application work has finished.

1. Services may declare asynchronous **initialization** and **disposal**. Initialization runs in declaration order before the server accepts traffic; a startup failure runs disposal on already-initialized services and propagates.
2. Shutdown follows a fixed documented order: **stop accepting new work → drain in-flight requests and tracked application tasks subject to a deadline → dispose services in reverse initialization order → report disposal failures**. A database-backed request in flight at shutdown therefore completes its permitted work before the database handle is disposed.
3. Shutdown is **idempotent**, and a programmatic stop is available so tests drive the same path as signals.
4. OS signal handling (SIGINT and SIGTERM) is **explicitly enabled by the application**; importing Lugas never installs global signal listeners.
5. **Deadline expiry has a defined, observable unsuccessful-shutdown outcome.** When tracked work remains at deadline expiry, shutdown reports an **unsuccessful or incomplete outcome** — never clean success merely because sockets are gone. Resources that may still be used by that work are **not disposed merely because the network connections have closed**. The defining invariant: the application must not quietly close a resource such as SQLite underneath work that continues after forced shutdown; the contract defines what continuing work observes (a defined failure state, never fabricated success) and what is recorded as non-cooperating.
6. **Three outcomes are reported distinctly** — connection closure, completion of tracked work, and completion of disposal. A single "stopped" boolean must not hide the differences between them.
7. **The guarantee covers tracked work only.** Detached application work that is neither awaited nor registered cannot be treated as though the framework has accounted for it; the application or its supervisor retains responsibility for any eventual process-termination policy. Lugas introduces neither implicit process exit nor a general task-orchestration system for this.

Per-request hook families remain excluded under ADR-0007's boundary and revisit trigger.

## Consequences

- Positive: resource cleanup becomes testable and ordered; shutdown can no longer silently strand in-flight work or dispose a database under an active request.
- Positive: the SSE helper's planned deterministic cleanup has a lifecycle foundation to build on.
- Cost/tradeoff: a small new public API (service descriptors/lifecycle options) after the API freeze — owner approval and a migration note required.
- Operational burden: the drain deadline needs a documented default and override; disposal failures need a defined reporting channel (stderr/diagnostics) that cannot change already-dispatched responses.
- Security effect: cleanup exactly once under completion/shutdown races is an acceptance criterion (resource counts return to baseline under repeated connect/disconnect/shutdown cycles).

## Alternatives considered

- A single `onShutdown(callback)` hook: rejected — it leaves the load-bearing question unanswered (when relative to requests still using the resource) and has no ordering story.
- Full request hook families (after-handle/after-response) to solve cleanup per request: rejected — outside the product boundary per ADR-0007; application services need no per-request hooks.
- Relying on Bun's server stop alone: rejected as insufficient — the server drains connections, but application resources have no defined relationship to that drain.
- Process-manager-only cleanup (let the OS kill the process): rejected — committed mutations may be fine, but SQLite handles, timers, and stream producers are not reliably cleaned by SIGKILL-adjacent paths.

## Evidence

`docs/reports/m4-test-lifecycle.md`: stop during in-flight request → no fabricated success, port released (Bun 1.4.0, Linux x86-64). `docs/reports/m5-cancellation.md`: 10 sequential abort cycles with no leaks; abort/cleanup boundary between Bun and application work recorded. The implementing issue adds the drain/race/idempotence evidence, including the required invariant sequence: a handler begins database-dependent work → the shutdown deadline expires → the connection is forcibly closed → the handler attempts to continue, with assertions that the resource is not closed underneath the continuing work, that the outcome is reported as non-cooperating, and that repeated connect/disconnect/shutdown cycles return resource counts to baseline.

## Revisit trigger

Per ADR-0007: a concrete production use case for per-request lifecycle hooks, with a lifecycle state machine and cancellation/streaming evidence. Also revisit if Bun's graceful-stop semantics change observably within the supported 1.4.x line.
