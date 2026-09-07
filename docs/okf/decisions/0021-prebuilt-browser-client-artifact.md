---
type: Architecture Decision Record
title: ADR-0021 — Prebuilt Browser-Executable Client Artifact
status: accepted
tags:
- adr
- architecture
- packaging
- client
- '0021'
generated:
  by: zcode/glm
  at: '2026-09-07T00:00:00+07:00'
---

# ADR-0021 — Prebuilt Browser-Executable Client Artifact

## Status

Accepted by owner decision (ODR-0003, `docs/owner-decisions/colorjoy-adr-approvals.md`, 2026-09-07), for this artifact and its necessary packaging changes — **not** a general rewrite of package exports. Extends [ADR-0012](0012-one-package-subpath-exports.md); the protected `package.json`/release-pipeline changes remain owned by the single M7-005 implementation issue.

## Context

The package ships direct `.ts` sources for all subpaths (a deliberate ADR-0012 choice that keeps one source of truth and preserves the compile-time contract). This works for bundler-based consumers — CI proves a browser-target build of `lugas/client` runs standalone — but a browser cannot resolve the bare specifier `lugas/client` from an npm installation. A deliberately **no-build** application (plain HTML + JavaScript served same-origin) therefore cannot consume the typed client at all, even though TypeScript's `checkJs`/`@ts-check` means "no bundler" and "no useful static checking" are different constraints.

Two distinct needs follow, and neither is met by the bundle-level proof alone:

1. **Browser execution:** a prebuilt, browser-executable ESM artifact whose imports browsers can resolve (direct URL, relative path, or import map), compiled by the maintainer so consumers need no build pipeline.
2. **Development-time checking:** declarations consumable by an independently configured frontend (its own `tsconfig.json`), including plain-JS consumers using `checkJs`.

A browser-ready runtime also does not by itself prove the generic client API is ergonomic from plain JavaScript; that needs its own fixture.

## Decision

The release tarball gains a **prebuilt, browser-executable ESM artifact of `lugas/client`**, generated in CI from the same source files that form the type contract:

1. Direct `.ts` sources remain the **only** source of truth for types (ADR-0012 unchanged in spirit); no hand-maintained `.d.ts` fork is shipped. The build output is regenerated per release and covered by the attestation/rehearsal pipeline so runtime artifact and type sources cannot drift silently.
2. The export map gains the minimal surface needed to make the artifact browser-resolvable (exact specifier decided at implementation with owner approval — e.g. a browser-target export condition or an additional subpath). This is a protected-file change owned by a single integrator issue.
3. Documentation covers the three no-build consumption arrangements: same-origin serving of the artifact (pairs with [ADR-0018](0018-opt-in-public-asset-serving.md)), an import map for the bare specifier, and continuing bundler-based use.
4. Acceptance requires a **plain-JavaScript, no-bundler fixture loading the artifact in a real browser** (not a bundler check) against a live Lugas server, plus a type-checking fixture proving an independently configured frontend receives the route contract (including a `checkJs` consumer), and a graph test proving the browser artifact pulls no server-runtime dependency. **The two browser stages stay distinct evidence:** stage one exercises the application with ordinary `fetch` — evidence for browser-to-server behavior, not yet for the packaged Lugas client; stage two exercises the **shipped artifact** — real browser module resolution and the correct JavaScript MIME type make serving the installed artifact materially stronger than checking that the repository can build it. Running the plain-JavaScript demonstration must not require configuring TypeScript; consumer type-checking stays independent evidence.
5. **The package consumer fixture installs the packed artifact into an unrelated temporary directory**, with the source checkout kept out of module resolution, so dependency-location problems of the kind the driving application encountered are caught rather than masked by sibling-checkout resolution.
6. **Lane independence:** this decision does not gate the same-origin browser fixture lane — the fixture starts against the application's existing `fetch` calls and switches to the packaged client once the artifact lands, keeping each change independently testable. Nor does it depend on the lifecycle decision. Scope honesty: this lane establishes the tested same-origin browser workflow; it is not cross-origin CORS coverage, not browser-hosted execution of the Lugas server, and not a claim about a broader browser matrix.
7. **Final acceptance anchor:** the browser loads JavaScript from the installed release artifact, calls the application successfully, and handles the required error and cancellation cases without rebuilding client source or resolving anything from the source checkout.

## Consequences

- Positive: no-build same-origin applications can use the typed client; the artifact gives real-browser test lanes a stable unit to exercise, closing the gap recorded in `docs/compatibility.md` (real browsers not executed in CI).
- Positive: the maintainer performs compilation once; consumers never adopt a toolchain to get typed client behavior.
- Cost/tradeoff: tarball payload grows by the artifact; the release pipeline gains a generated-output step that attestation must cover.
- Compatibility effect: protected-file change (`package.json` exports, release scripts) — single owning issue; existing bundler consumers are unaffected (sources remain).
- Security/supply-chain effect: the generated artifact enters the SBOM/attested-tarball inventory and must be reproducible from the attested commit.

## Alternatives considered

- Require consumers to bundle `lugas/client`: rejected for the no-build use case (bundling remains fully supported and documented).
- Publish a separate client package: rejected — ADR-0012 keeps one package with subpath exports, and a split package doubles release/attestation surface.
- Ship hand-maintained `.d.ts` alongside sources: rejected — two sources of truth for the contract.
- Embed the client in a single-file HTML bundle: deferred — out of scope; a literally single-file artifact cannot have external dependencies and can keep a hand-written fetch path.

## Evidence

Tarball consumer fixtures already prove server, bundled-client-in-Node, and testing-helper consumers run against the packed artifact (`tests/release/package-consumers/`, `tests/package/consumer-types/` — README snippet fixtures compile against the installed tarball per M6R14-ATT). The browser-executable gap is recorded in `docs/compatibility.md`: bundle-level proof only, no real-browser execution. The implementing issue adds the real-browser no-build fixture, the independent-tsconfig/checkJs fixtures, and artifact reproducibility evidence.

## Revisit trigger

If generated-artifact maintenance or attestation cost exceeds its adoption benefit, or if a future decision ships compiled output for all subpaths (superseding the ADR-0012 source distribution).
