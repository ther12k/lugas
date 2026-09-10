---
type: Owner Decision Record
title: 'ODR-0018: M9-GATE Closure and Post-Beta.4 Disposition'
status: accepted
tags:
- owner-decision
- m9
- release
- beta.4
- stop-rule
---

# ODR-0018: M9-GATE Closure and Post-Beta.4 Disposition

## Context

The ODR-0010 post-beta.3 battery sequence is complete: all seven batteries
(M9-002 cookies through M9-008 rate limiting) merged on `main` with green CI,
folded into the attested beta.4 packet (PR #387; source/attestation commit
`373418f`, tarball sha256 `6c31b498…`), and published by the owner to npm
under the `beta` dist-tag on 2026-09-11. Registry verification the same day:
the downloaded tarball is byte-identical to the attestation, and a consumer
smoke test from the published package passed (core round-trip, rateLimit
200→429 with retry headers, cookie set/read). Publication records landed in
PR #388 (changelog, README, getting-started). The `v0.1.0-beta.4` tag points
at the package source commit and the GitHub prerelease carries the four
attested assets (tarball, SHA256SUMS, provenance, SBOM). The owner directed
execution of the remaining follow-ups ("do all", 2026-09-11).

## Decision

1. **M9-GATE ([#385](https://github.com/ther12k/lugas/issues/385)) closes.**
   The full ODR-0010 sequence is shipped and published; no battery work
   remains.
2. **The owner stop-rule takes effect.** Through 0.1.0 stabilization, no new
   features ship: work is limited to fixes, documentation, evidence upkeep,
   and release engineering. Stabilization inputs are beta feedback,
   compatibility matrix maintenance, and performance evidence upkeep.
3. **ADR-0031 (MCP adapter) remains proposed/parked for 0.1.0.** Its parking
   condition ("until ODR-0010 item (d) closes") has now been met, and the
   disposition under the stop-rule is: not accepted, not withdrawn —
   re-opening requires an explicit owner instruction after stabilization,
   and acceptance would additionally require a spec-version pin (per the
   ADR's own conditions). `docs/open-decisions.md` updated accordingly.
4. **`latest` dist-tag stays at `0.1.0-beta.2` until the owner completes the
   move.** The attempt (`npm dist-tag add lugas@0.1.0-beta.4 latest`) was
   made under this authorization and was rejected with `EOTP` — npm metadata
   changes require the owner's one-time password. The exact command remains:
   `npm dist-tag add lugas@0.1.0-beta.4 latest --otp=<code>`. Documentation
   continues to state the truthful current state.
5. **M7-005 browser-lane flake addressed (PR #389, merged `1b9b084`).**
   Capability-wait timeouts raised — CDP launch 15→60s, in-page wait 15→30s,
   page-load 20→30s — with no test assertion weakened and no workflow file
   touched (the fix lives entirely in the test harness).

## Effect

- The roadmap's post-beta.3 sequence is fully shipped; the differentiator
  phase begins — small API, strong typing, Bun-native performance, release
  evidence.
- ADR-0031's register row now reads "parked for 0.1.0 (ODR-0018)".
- The next owner actions are optional: the `latest` dist-tag move (OTP) and
  any beta-feedback triage.
