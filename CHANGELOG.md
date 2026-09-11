# Changelog

All notable changes to Lugas are documented here. The project is pre-1.0 and the public API may still evolve based on beta feedback.

## [Unreleased]

> Prepared for `0.1.0-beta.5` — a verification release with **no new framework features**: it exists to prove the corrected release pipeline from the npm registry (stamped `frameworkVersion`, consumer metadata) after the CF-1 finding. See `docs/reports/consumer-smoke-2026-09-12.md` and `docs/reports/release-readiness-sweep-2026-09-12.md`.

### Changed

- Release packet now stamps the staged `src/internal/framework-version.ts` with the published version and the rehearsal asserts `manifest.frameworkVersion` end-to-end from the installed tarball. Published beta.1–beta.4 artifacts permanently report `frameworkVersion: "0.0.0"` (repo `package.json` stays `0.0.0` by convention and `scripts/sync-version.ts` was wired into nothing); corrected from the first release built after this change (CF-1).
- Staged package metadata: `engines: { bun: ">=1.4.0" }` (machine-readable Bun support floor — owner decision on CF-3: declaration, not enforcement), plus `repository`, `bugs`, `homepage`, and `keywords` so the npm package page links back to the project.
- README links are absolute GitHub URLs so they resolve on npmjs.com; npm never rewrites relative links and the tarball ships no `docs/` or `examples/` trees.
- README redesigned as a compact public front door; detailed content moved into documentation pages (`docs/getting-started.md`, `docs/wire-honest-types.md`, `docs/design-principles.md`, `docs/roadmap.md`), with an Astro/Starlight documentation site under `website/`.

### Added

- `examples/realworld/` reference application composing every shipped capability (Drizzle, validation, cookie sessions, SSE, WebSocket presence, bounded uploads, logging, health, OpenAPI+Scalar, typed client) with a 13-test integration suite — the 0.1.0 canary (dogfood, PR #397).
- Registry consumer-smoke evidence for `lugas@0.1.0-beta.4` (clean-room install, all capability lanes green; findings CF-1/CF-2/CF-3, PR #398) and the dogfood friction log RF-1..RF-7 (`docs/reports/dogfood-realworld-findings.md`).
- "Type checking" section in `docs/getting-started.md`: the two load-bearing consumer settings (`types: ["@types/bun"]`, `lib: ["esnext"]` without DOM) whose absence fails typecheck inside the installed package (CF-2).
- Post-0.1.0 program adopted (ODR-0019: "the application framework for Bun") with ADR-0035 Application Fetch Interface proposed and parked until 0.1.0; stabilization stop-rule (ODR-0018) explicitly preserved.
- Community files: issue templates, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, this changelog; expanded `CONTRIBUTING.md`; `examples/README.md` index and `examples/client/README.md`; project logo.

### Fixed

- `docs/services.md` opening example typechecked against reality: `ctx.services` typing does not flow from `defineApp` inference; the documented pattern now matches the working explicit-type/cast approach (dogfood finding RF-1 — ergonomic redesign remains post-0.1.0 feedback, deliberately not implemented).
- `docs/openapi.md` Scalar UI example clarified: the UI is opt-in (`ui: true`), not default (RF-6).

## [0.1.0-beta.4] — published 2026-09-11

Attested release candidate completing the ODR-0010 battery sequence, frozen at `373418fffe3ebb42bbe39f56e0c3c95e4f06dd00` (tarball sha256 `6c31b498…`; evidence: [`docs/releases/beta/RELEASE_PACKET.md`](docs/releases/beta/RELEASE_PACKET.md)); published to npm under the `beta` dist-tag on 2026-09-11 and verified byte-identical to the attested tarball.

### Added

- Cookie primitives (`parseCookies()`/`cookie()`) — lenient RFC 6265 reading, fail-closed strict `Set-Cookie` serialization, auth-interop recipe (ADR-0027).
- WebSockets (`websocket()` routes) — pre-upgrade guards and schema validation through the compiled pipeline, native `ServerWebSocket` unwrapped, shutdown close-1001 (ADR-0028).
- Production hardening (`secureHeaders`, `health`) — conservative secure-header defaults with strictly opt-in CSP, lifecycle-aware `/health` and `/ready` (ADR-0029).
- Multipart uploads (`form()` body codec) — bounded stream consumption with field/file/size limits and native `File` values (ADR-0030).
- Telemetry hooks (`defineApp({ telemetry })`) — dependency-free `onRequestStart`/`onRequestEnd` events with task correlation and the OpenTelemetry recipe (ADR-0032).
- Compression + ETag (`defineApp({ compression })`, `defineApp({ etag })`) — native gzip/deflate negotiation with structural skips and `Vary: Accept-Encoding`; strong SHA-1 validators with `If-None-Match` → 304 (ADR-0033).
- Rate limiting (`rateLimit()` guard) — fixed-window semantics over application-owned structural storage, 429 with `Retry-After`/`RateLimit-*` fields and an RFC 9457 body (ADR-0034).
- Agent-facing docs (`docs/ai-agents.md`) — agent surfaces table, LLM streaming recipe; proposed MCP adapter ADR parked pending owner decision (ADR-0031).

### Changed

- Typecheck performance budget recalibrated 2000→2500 ms (baseline v2) — measured scope growth across M6–M9, not a regression; throughput thresholds and client-bundle cap unchanged.

## [0.1.0-beta.3] — published 2026-09-10

Attested release candidate, frozen at `f3c72e6031dff07746b746e8b815400f270d39e1` (tarball sha256 `11d7033e…`; evidence: [`docs/releases/beta/RELEASE_PACKET.md`](docs/releases/beta/RELEASE_PACKET.md)); published to npm under the `beta` dist-tag on 2026-09-10.

### Added

- Drizzle ORM adapter (`lugas/drizzle`, `drizzleService()`) — an application-owned Drizzle instance as a lifecycle-managed service: structural validation with no `drizzle-orm` import, exact instance typing into handler context, opt-in `closeOnDispose` (ADR-0026).

## [0.1.0-beta.2] — published 2026-09-09

Attested release candidate, frozen at source commit `7f08b16` (regenerated on the M8-GATE integration `3edaae9`; evidence: [`docs/releases/beta/RELEASE_PACKET.md`](docs/releases/beta/RELEASE_PACKET.md)); published to npm under the `beta` dist-tag on 2026-09-09.

### Added

- First-party CORS policy (`defineApp({ cors })`) — explicit origin allowlists and callbacks, preflight handling, `Vary: Origin` on every response, fail-closed configuration diagnostics (ADR-0022).
- Server-Sent Events helper (`sse()`) with `formatSseEvent()`, correct `text/event-stream` framing, opt-in heartbeat, and deterministic exactly-once cleanup (ADR-0023).
- Structured logging (`defineApp({ logging })`) — sink contract, request IDs (`x-request-id`), opt-in access log, scalar-only fields for redaction by construction (ADR-0024).
- OpenAPI 3.1 generation from routing facts with an opt-in zero-dependency Scalar reference UI (`defineApp({ openapi })`) (ADR-0025).

### Fixed

- npm package README logo URL stabilized for registry rendering.

## [0.1.0-beta.1] — attested 2026-09-03, published 2026-09-09

Attested release candidate, frozen at `2ed954deb648cdb8e40d7b05e6c0cb0d116f050b` (evidence: [`docs/releases/beta/RELEASE_PACKET.md`](docs/releases/beta/RELEASE_PACKET.md)). Published to npm on 2026-09-09; superseded by `0.1.0-beta.2`/`0.1.0-beta.3`.

### Added

- Bun-native HTTP server with typed route declarations and root/module composition.
- Standard Schema v1 validation on params, query, headers, and body with schema-derived handler types.
- Ordered guards with typed context enrichment and short-circuiting responses.
- Status-discriminated response helpers (`json`, `text`, `problem`, `empty`) owning their media types, with wire-honest `Jsonify` response types modeling `JSON.stringify` truth (dates → strings, non-finite numbers → `null`, `toJSON()` drop/throw semantics, `bigint` throw signals).
- RFC 9457 Problem Details errors with redacted 500s and stable `LUGAS_*` diagnostics.
- End-to-end typed client (`lugas/client`) — explicit calls over `fetch`, no Proxy, no code generation, browser-safe bundle.
- Test-server helpers (`lugas/testing`) and a route-inspection CLI emitting `lugas-manifest-v1`.

[Unreleased]: https://github.com/ther12k/lugas/compare/v0.1.0-beta.4...HEAD
[0.1.0-beta.4]: https://www.npmjs.com/package/lugas/v/0.1.0-beta.4
[0.1.0-beta.3]: https://www.npmjs.com/package/lugas/v/0.1.0-beta.3
[0.1.0-beta.2]: https://www.npmjs.com/package/lugas/v/0.1.0-beta.2
[0.1.0-beta.1]: https://www.npmjs.com/package/lugas/v/0.1.0-beta.1
