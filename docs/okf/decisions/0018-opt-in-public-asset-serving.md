---
type: Architecture Decision Record
title: ADR-0018 — Opt-In Public Asset Serving Through the Bun Adapter
status: accepted
tags:
- adr
- architecture
- static-assets
- '0018'
generated:
  by: zcode/glm
  at: '2026-09-07T00:00:00+07:00'
---

# ADR-0018 — Opt-In Public Asset Serving Through the Bun Adapter

## Status

Accepted by owner decision (ODR-0003, `docs/owner-decisions/colorjoy-adr-approvals.md`, 2026-09-07), within the described scope: explicit mappings and prefixes, public content only, no root catch-all or SPA fallback. The approval was made against the summarized contract and pinned-runtime probe record; file-level review occurs through the M7-001 implementation evidence. This decision approves asset serving only — it does not approve lifecycle APIs ([ADR-0020](0020-application-service-lifecycle.md)), route-level body budgets ([ADR-0019](0019-body-budget-policy.md)), or package-export changes ([ADR-0021](0021-prebuilt-browser-client-artifact.md)); those were decided individually. Linked implementation issue: `docs/okf/issues/m7/M7-001-add-opt-in-native-asset-routes-with-explicit-api-ownership-and-safe-misses.md` (also drafted at `docs/proposals/colorjoy-same-origin-milestone.md`).

## Problem

The driving application (ColorJoy: a same-origin, no-build drawing app on Lugas) needs the server to serve frontend assets without repurposing the API's not-found handling or maintaining its own filesystem server. Hand-rolled wildcard handlers have a probed failure mode: an asset miss that throws ENOENT exposes Bun's development error response **when Bun's development error responses are active** — a 500 HTML page including working directory, stack, and source context. In production configuration the same unhandled failure returns a plain minimal 500 with no disclosure (both modes probed on the pinned runtime). This is recorded precisely as: *a handwritten asset-handler failure exposes development diagnostics when Bun's development error response is active*; no production-mode disclosure is claimed.

Repository probing of the supported Bun 1.4.0 (Linux x86-64, 2026-09-06/07) shows the pinned runtime already provides the underlying mechanisms as native route values, making this an integration task rather than a Bun-upgrade or filesystem-server project:

- `"/prefix/*": { dir }` directory routes: correct MIME, native 404 on missing files, single percent-decode path resolution, weak `ETag`/`If-None-Match` → 304, `Last-Modified`, single-range `Range` → 206.
- A method map wrapping a directory value (`{ GET: { dir } }`) is accepted at runtime: GET and HEAD serve the asset; other methods fall through to the `fetch` fallback (404 via the app's not-found policy). This composition sits outside the published Bun route-value types and must be pinned by tests at Lugas's boundary.
- Containment probed on Linux: double-encoded (`%252e%252e`) and mixed-encoded (`..%252f`) traversal → 404; a symlinked entry pointing outside the served tree → 404 (link verified resolvable via plain fs).

## Decision

Introduce an **opt-in asset configuration** at Lugas's Bun-serving boundary, using native Bun file/directory primitives wherever their behavior satisfies the contract. Lugas implements no filesystem server, MIME map, or cache layer; it validates and mounts configuration into the compiled native route map and owns the documented ownership, method, and miss contracts below.

## Initial scope

- **Explicit file mappings** (named URL paths to specific files) and **directory mounts under explicit URL prefixes**.
- Explicit mounts rather than unrestricted root-directory catch-alls. An application can map `/` and root-level files explicitly and mount a directory under `/assets/*` or another selected prefix.
- Existing behavior is preserved bit-for-bit when asset configuration is absent.

## Non-goals

- Frontend compilation, SSR, or any build tooling.
- Automatic SPA/navigation fallback (a future opt-in decision — see the routing contract).
- Authenticated file downloads; access-controlled content in served directories is a documented anti-pattern, not a supported arrangement.
- Arbitrary Bun route injection or a new general-purpose middleware system.
- Any approval of lifecycle APIs, route-level body budgets, or package-export changes.

## Routing contract

Namespace ownership comes from the application's configuration and declared structure; Lugas does not silently reserve `/api` or any global prefix. Bun prioritizes exact, parameter, and wildcard matches by specificity; object-spread order does not establish semantic precedence. The frozen contract is a request-ownership table, not a precedence slogan:

| Situation | Contract |
|---|---|
| Request matches an API-owned path | Preserve API dispatch and its method/error behavior; do not retry it as an asset. |
| Unknown path inside an explicitly API-owned namespace | Return the API not-found response, even when a corresponding public file exists. |
| Existing file inside an asset-owned namespace | Serve the native asset response. |
| Missing file inside an asset-owned namespace | Return an asset 404; do not fall through to HTML. |
| Asset request using a disallowed method | Return the documented rejection, never file contents or a successful HTML fallback. |
| Ambiguous API/asset ownership | Reject configuration at startup unless this ADR's overlap rules explicitly define and test that overlap. |
| SPA navigation fallback | Not part of this initial feature; a future opt-in decision. |

**Method policy resolution (in-ADR):** the method allowlist is enforced by *how the native value is mounted* — a directory value wrapped in a method map keyed with only the allowed methods (`GET`; HEAD is honored for GET keys). This composition is runtime-verified on Bun 1.4.0 but outside the published types; Lugas casts at its boundary and pins the behavior with regression tests. If Bun rejects or changes the composition, that is a revisit trigger, not grounds for a Lugas-owned method guard in front of the native route.

The frozen method contract, in substance: **asset mounts serve through GET and HEAD. Other methods do not serve asset content and reach the documented not-found outcome. This integration does not promise a 405 response.** Because Bun's fallback `fetch` handler answers unmatched requests, the integration must demonstrate the final response through Lugas's assembled routing configuration — not merely prove that the directory route itself declined the method. Both mapping forms (explicit file mappings and directory-prefix mounts) obey the same public method contract, and tests assert the response, not only its status: HEAD sends no asset body; unsupported methods expose no file bytes and do not accidentally reach a different handler that returns an application shell.

## Security contract

- **Public-directory boundary:** protected or access-controlled files must live outside served directories. Bun's warning applies — case-sensitive routing combined with case-insensitive filesystems makes overlapping routes unsuitable as an access-control boundary; Lugas documents this rather than attempting route-overlap protection.
- **Method policy:** per the resolution above — GET/HEAD serve; all other methods get the documented not-found rejection, never file contents.
- **Missing-file behavior:** the native asset 404; handwritten existence handling is not required of applications.
- **Error disclosure:** the ENOENT classification in the Problem section; regressions cover both development and production modes. A missing asset remains an ordinary 404; genuine unexpected failures follow an explicit, sanitized response policy and are not indiscriminately disguised as file-not-found.
- **Containment:** percent-decode-once semantics, double/mixed-encoded traversal rejection, and symlink behavior are probed on Linux — Bun documents Linux containment through `openat2(RESOLVE_IN_ROOT)` — and become mandatory per-platform acceptance gates for whichever platforms the feature claims to support. The Linux result must not become a blanket cross-platform containment claim; symlink/junction and case-folding semantics differ across OSes.

## Release impact

The approved target is the next release candidate after `v0.1.0-beta.1`; the attested beta.1 artifact set is preserved unmodified. New implementation and package bytes enter through the normal release pipeline and require their own applicable release evidence (attestation, checksums, consumer rehearsal) per the evidence-gated claims policy ([ADR-0016](0016-evidence-gated-claims.md)).

## Acceptance anchor

ColorJoy deletes its custom static-serving implementation without changing its API behavior or introducing a frontend build requirement. The in-repository equivalent is the linked implementation issue's test groups (routing and methods, native HTTP behavior, containment, disclosure, framework boundaries, consumer integration).

## Consequences

- Positive: native serving performance and caching validators are preserved, not reimplemented; [ADR-0004](0004-bun-native-router-authoritative.md) holds because assets are native route values, not a framework router.
- Positive: same-origin no-build applications get first-party asset support with distinguishable API/asset misses.
- Cost/tradeoff: post-freeze public API growth (owner-gated); a security-sensitive surface whose containment tests are acceptance criteria, not optional hardening.
- Documentation burden: the ownership table, method policy, and dev/prod disclosure classification must be documented and tested verbatim.

## Alternatives considered

- Hand-rolled per-application wildcard handler: rejected as the productized path — probed to expose development diagnostics on ENOENT and to push MIME/cache/existence concerns onto every application.
- A Lugas-owned filesystem server with its own MIME map: rejected as duplication of native capability ([ADR-0002](0002-bun-only-native-runtime.md), [ADR-0004](0004-bun-native-router-authoritative.md)).
- Unrestricted root-directory catch-all mounts: rejected for the initial scope — they entangle API and asset ownership and make SPA routing implicit.
- Default-on SPA fallback: rejected — silent HTML on API misses destroys error distinguishability.
- Directing applications to a separate static file server: remains a valid deployment arrangement to document, but does not serve the same-origin no-build use case.

## Evidence

Pinned-runtime probes, Bun 1.4.0, Linux x86-64 (2026-09-06/07): `{ dir }` mount serving GET/HEAD/POST/PUT/DELETE/OPTIONS all 200 with file contents (bare mount); `{ GET: { dir } }` composition → GET 200, HEAD 200, POST 404 fall-through; double-encoded and mixed-encoded traversal → 404; verified symlink pointing outside the tree → 404; unhandled handler throw with development error responses active → 500 HTML leaking CWD/source (≈50 KB), production mode → minimal 500 (21 bytes, no leak). The 21-byte observation stays in the probe record; the regression contract establishes the intended status and the absence of seeded sensitive details — paths, exception data, source snippets — rather than depending on the exact wording or byte count of Bun's generic error message. Probe scripts and outputs to be archived as deterministic regressions with the implementing issue's evidence report. Related prior evidence: `docs/reports/m5-native-route-security.md`.

## Revisit trigger

Bun changes directory-route semantics (method composition, decode-once resolution, validator headers, symlink handling) within the supported 1.4.x line; a platform in the support claim demonstrates different containment behavior; or a production use case requires manifest-visible asset routes or SPA fallback (new decision required).
