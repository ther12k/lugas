# Changelog

All notable changes to Lugas are documented here. The project is pre-1.0 and the public API may still evolve based on beta feedback.

## [Unreleased]

### Changed

- README redesigned as a compact public front door; detailed content moved into documentation pages (`docs/getting-started.md`, `docs/wire-honest-types.md`, `docs/design-principles.md`, `docs/roadmap.md`), with an Astro/Starlight documentation site under `website/`.

### Added

- Community files: issue templates, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, this changelog; expanded `CONTRIBUTING.md`; `examples/README.md` index and `examples/client/README.md`; project logo.

## [0.1.0-beta.1] — attested 2026-09-03 (publication pending)

Attested release candidate, frozen at `2ed954deb648cdb8e40d7b05e6c0cb0d116f050b` (evidence: [`docs/releases/beta/RELEASE_PACKET.md`](docs/releases/beta/RELEASE_PACKET.md)). npm publication is an explicit owner action and has not occurred yet.

### Added

- Bun-native HTTP server with typed route declarations and root/module composition.
- Standard Schema v1 validation on params, query, headers, and body with schema-derived handler types.
- Ordered guards with typed context enrichment and short-circuiting responses.
- Status-discriminated response helpers (`json`, `text`, `problem`, `empty`) owning their media types, with wire-honest `Jsonify` response types modeling `JSON.stringify` truth (dates → strings, non-finite numbers → `null`, `toJSON()` drop/throw semantics, `bigint` throw signals).
- RFC 9457 Problem Details errors with redacted 500s and stable `LUGAS_*` diagnostics.
- End-to-end typed client (`lugas/client`) — explicit calls over `fetch`, no Proxy, no code generation, browser-safe bundle.
- Test-server helpers (`lugas/testing`) and a route-inspection CLI emitting `lugas-manifest-v1`.

[Unreleased]: https://github.com/ther12k/lugas/compare/v0.1.0-beta.1...HEAD
[0.1.0-beta.1]: https://github.com/ther12k/lugas/releases/tag/v0.1.0-beta.1
