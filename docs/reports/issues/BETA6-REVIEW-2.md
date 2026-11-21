---
type: Issue Evidence Report
title: BETA6-REVIEW-2 — Second review round of the beta.6 candidate
status: current
tags:
- review
- beta
- compression
- browser
---

# BETA6-REVIEW-2 — Second review round of the beta.6 candidate

## Baseline and outcome

A second review of the revised candidate (`f6853cc`) covered the HTTP
conditional path, shutdown/listener behavior, and the browser/verification
lane. Three source-level findings on the conditional path and one reproduced
regression in browser-executable discovery were confirmed and fixed:

1. Wildcard detection split `If-None-Match` on commas, so a single quoted
   tag whose opaque bytes contain a comma and `*` (e.g. `"rev,*,next"`)
   was treated as the wildcard. The flaw predates this branch in the
   tag-matching helper; the revision made it reachable for SSE, where it
   cancelled a live stream into a `304`. RFC 9110 §13.1.2 allows `*` only
   as the entire field value — detection and matching now honor exactly
   that, and a malformed `*` inside a list never matches.
2. Framework validators were minted over failure-status bodies, so
   replaying the validator of a stable `404` returned a bodyless `304`,
   masking the failure (pre-existing for strong validators; the weak
   comparison fix extended it). The selected representation exists only
   for a successful response (RFC 9110 §3.2): non-2xx responses now cross
   the etag pass untouched, so no conditional can mask an error.
3. A wildcard conditional on a bodyless success (a HEAD-style handler
   returning `new Response(null, { status: 200 })`) hit the
   nothing-to-hash guard and stayed `200`. The wildcard is now evaluated
   before that guard and answers `304` with current metadata.
4. The ENOENT-tolerant browser discovery from the first round required
   `existsSync(candidate)`, which rejects a `LUGAS_BROWSER_EXECUTABLE`
   override that is a bare command name Bun would resolve through `PATH`.
   Reproduced with a fake executable on `PATH` (parent commit selected it;
   `f6853cc` selected a fallback). Only absolute candidates now get the
   existence pre-check; everything else is probed through `spawnSync`,
   whose ENOENT throw moves to the next candidate.

Non-findings recorded for auditability: exact-tag revalidation of a cached
error representation is no longer reachable through framework validators
(item 2 removes the minting), and the pre-existing single-upgrade-`serverRef`
limitation of the WebSocket hub is unchanged (see BETA6-REVIEW-FIXES).

## Files and acceptance

- Owned: `src/internal/compression.ts` (sole-value wildcard detection, 2xx
  gate, wildcard-before-body-guard), `tests/browser/cdp.ts` (PATH-aware
  candidate probing), this report.
- Adjacent: `tests/compression/compression.test.ts` (three new regression
  tests), `docs/compression.md`, `CHANGELOG.md`. No protected file,
  dependency, or release artifact changed.

## Verification

- `bun test tests/compression tests/sse`: 58 passed, 0 failed, including:
  "failure responses carry no framework validator and can never be masked
  by one", "a quoted tag containing commas is never mistaken for the
  wildcard", "a bodyless success answers a wildcard conditional with 304".
- Browser override reproduction: with a fake `chrome`-style executable on
  `PATH` and `LUGAS_BROWSER_EXECUTABLE=<command name>`, discovery selects
  the override; with a nonexistent command name it falls through to the
  next candidate without throwing.
- Full `bun run verify` (strict browser flag) in a clean clone of the
  revised branch: recorded in the follow-up docs commit alongside this
  revision, matching the first round's reporting order.

## Boundaries and working tree

The starter browser lane remains outside clean CI (protected workflow
files; owner decision). The listener-isolation review thread's agent report
had not arrived when this report was written; the shutdown-scoping fix it
covers was verified directly (sibling keeps echoing, stopped listener gets
`1001`) and the shared-`serverRef` handshake limitation is documented as
pre-existing. No release-mode benchmarks, attestation, publication, or
push.
