# Changelog

All notable changes to Lugas are documented here. The project is pre-1.0 and the public API may still evolve based on beta feedback.

## [Unreleased]

### Changed

- README redesigned as a compact public front door; detailed content moved into documentation pages (`docs/getting-started.md`, `docs/wire-honest-types.md`, `docs/design-principles.md`, `docs/roadmap.md`), with an Astro/Starlight documentation site under `website/`.

### Added

- Community files: issue templates, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, this changelog; expanded `CONTRIBUTING.md`; `examples/README.md` index and `examples/client/README.md`; project logo.

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

[Unreleased]: https://github.com/ther12k/lugas/compare/v0.1.0-beta.3...HEAD
[0.1.0-beta.3]: https://www.npmjs.com/package/lugas/v/0.1.0-beta.3
[0.1.0-beta.2]: https://www.npmjs.com/package/lugas/v/0.1.0-beta.2
[0.1.0-beta.1]: https://github.com/ther12k/lugas/releases/tag/v0.1.0-beta.1
