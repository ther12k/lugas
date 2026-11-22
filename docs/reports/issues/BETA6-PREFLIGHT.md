---
type: Issue Evidence Report
title: BETA6-PREFLIGHT — Reconcile release status and hand off candidate qualification
status: current
tags:
- release
- beta
- documentation
---

# BETA6-PREFLIGHT — Reconcile release status and hand off candidate qualification

## Baseline and outcome

The roadmap still listed beta.4 under both npm tags, and the changelog's
Unreleased section still described beta.5. A credential-free npm metadata
read confirmed `beta → 0.1.0-beta.5` and `latest → 0.1.0-beta.4`. Registry
version history included beta.5 with publication timestamp
`2026-09-13T16:15:45.345Z` and did not include beta.6. The local
`v0.1.0-beta.5` tag resolves to the source commit `6943f88`.

## Files and acceptance

- Owned: `CHANGELOG.md` records beta.5 separately and lists the pending
  dual-distribution change, guided starter, and stabilization fixes
  under Unreleased. It does not claim new publication or attestation.
- Adjacent: `docs/roadmap.md` reconciles shipped Drizzle, current tags,
  the closed beta.5 follow-up, and candidate-specific beta.6 qualification.
- Evidence: this report. No release artifacts, scripts, or protected files
  changed. The public registry lookups sent no credentials or artifacts.

## Verification

- `npm view lugas dist-tags time.0.1.0-beta.5 time.0.1.0-beta.6 --json --registry=https://registry.npmjs.org/`:
  confirmed the recorded tags; dotted time selectors did not return data
  in npm 10.8.2.
- `npm view lugas time versions --json --registry=https://registry.npmjs.org/`:
  parsed the timestamp and checked beta.6 absence against the returned list.
- `git rev-parse --short 'v0.1.0-beta.5^{}'`: `6943f88`.
- `bun run verify:docs`, `bun run scripts/generate-llms.ts --check`,
  `bun run scripts/generate-agent-docs.ts --check`, and `git diff --check`:
  passed. `git diff --exit-code HEAD -- docs/releases artifacts/beta`:
  clean; historical beta.5 evidence is untouched.

## Qualification handoff

The earlier development gate passed 984 tests with six skips. That result
is not a release attestation. The current working tree has uncommitted
stabilization changes and these docs; `release:package:rehearse` rejects
such a tree and packages only `git archive HEAD`. No rehearsal or release
performance measurements were run in this step.

Once the source is reviewed and committed, qualify it on the documented
quiet baseline host. In a dedicated release checkout that preserves the
historical beta.5 artifacts, follow the packet builder's ordering: capture
the benchmark archives, run `bun run release:package:rehearse`, and run
`LUGAS_PERF_RELEASE=1 bun run verify` against the final tarball. The owner
controls packet assembly and publication under ODR-0021. The six-cell
OS/Bun matrix, issue-tracker P0/P1 check, and exact-tarball registry
acceptance remain candidate-specific; no beta.5 waiver transfers.
No commit, push, tag, or publish was performed.
