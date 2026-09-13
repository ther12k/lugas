# LugasJS v0.1.0-beta.5 Release Packet

**Candidate Version:** `0.1.0-beta.5`\
**Package Source Commit:** `6943f88d571266511ad53d826453bbf4413974cd`\
**Attestation Commit:** `6943f88d571266511ad53d826453bbf4413974cd` (`6943f88`)

**Generated:** 2026-09-13T15:58:38.710Z\
**Runtime:** Bun 1.4.0 · TypeScript 7.0.2 · Linux x86-64 / macOS arm64 / Windows x64\
**Package:** `lugas` (unscoped) · License: Apache-2.0 · Repo: `ther12k/lugas`

---

## 1. Executive Summary

This packet contains the complete source, package, evidence, and governance artifacts for the **LugasJS v0.1.0-beta.5** release candidate. All milestones (M0–M9, the complete ODR-0010 battery sequence) are complete with one recorded deferral: the release-mode performance gate is DEFERRED by ODR-0020 (see §4 — full gate runs on the quiet baseline host before general-availability promotion); the full verification gate was executed by the packet builder at assembly time, and the tracker was last verified free of open P0/P1 defects at packet assembly (the owner re-verifies at publication — see CHECKLIST.md).

Publication remains strictly gated on owner approval in **M8-GATE**.

---

## 2. Release Candidate Metadata & Identity

| Attribute | Approved Value | Reference |
|---|---|---|
| Product Name | **LugasJS** (shortened to **Lugas**) | ADR-0001 |
| Package Name | **`lugas`** (unscoped) | ODR-0001 (`docs/owner-decisions/naming-assets.md`) |
| Version | **`0.1.0-beta.5`** | SemVer beta candidate |
| Repository | **`ther12k/lugas`** | GitHub |
| License | **Apache-2.0** (full text in `LICENSE`) | ODR-0002, `NOTICE` |
| Security Policy | GitHub Private Advisories (48h SLA) | `SECURITY.md` |
| Governance | Lead Maintainer / BDFL model | `GOVERNANCE.md` |

---

## 3. Evidence Index

### Gate Reports
- [`docs/reports/gates/M0.md`](../../reports/gates/M0.md)
- [`docs/reports/gates/M1.md`](../../reports/gates/M1.md)
- [`docs/reports/gates/M2.md`](../../reports/gates/M2.md)
- [`docs/reports/gates/M3.md`](../../reports/gates/M3.md)
- [`docs/reports/gates/M4.md`](../../reports/gates/M4.md)
- [`docs/reports/gates/M4R1-GATE.md`](../../reports/gates/M4R1-GATE.md)
- [`docs/reports/gates/M5.md`](../../reports/gates/M5.md)
- [`docs/reports/gates/M5R1-GATE.md`](../../reports/gates/M5R1-GATE.md)
- [`docs/reports/gates/M6.md`](../../reports/gates/M6.md)
- [`docs/reports/gates/M7.md`](../../reports/gates/M7.md)
- [`docs/reports/gates/M8.md`](../../reports/gates/M8.md)

### Candidate Evidence (canonical for THIS candidate)
- [`docs/releases/beta/release-evidence.json`](release-evidence.json) — `lugas-release-evidence-v2`; two-identity bindings (`packageSourceCommit` + `attestationCommit`), measured medians, tarball hash
- [`docs/releases/beta/package-rehearsal.json`](package-rehearsal.json) — `lugas-package-rehearsal-v1`; rehearsal checks and dry-run publication result
- [`docs/reports/gates/M6.md`](../../reports/gates/M6.md) — M6 GO verdict + M6R1–M6R6 post-GATE addenda (attestation procedure)

### M6 Candidate Review Reports (history)
- [`docs/reports/m6-api-freeze.md`](../../reports/m6-api-freeze.md) — Public API candidate freeze
- [`docs/reports/m6-compatibility.md`](../../reports/m6-compatibility.md) — 6-cell CI matrix verification
- [`docs/reports/m6-naming-availability.md`](../../reports/m6-naming-availability.md) — npm namespace and collision review
- [`docs/reports/m6-package-rehearsal.md`](../../reports/m6-package-rehearsal.md) — Publication rehearsal history (superseded for this candidate by `package-rehearsal.json`)
- [`docs/reports/m6r4-final-evidence.md`](../../reports/m6r4-final-evidence.md) — Prior-candidate evidence bundle (superseded for this candidate by `release-evidence.json`)
- [`docs/reports/m6-clean-room-agent.md`](../../reports/m6-clean-room-agent.md) — Independent clean-room agent proof
- [`docs/reports/m6-final-verification.md`](../../reports/m6-final-verification.md) — Prior-candidate verification history (superseded)

---

## 4. Performance & Resource Budgets (Release Mode) — DEFERRED

> **DEFERRED by ODR-0020.** The release-mode performance gate was **not executed** for this candidate: the pinned baseline host is occupied by an unrelated soak campaign, and measurements captured under load are void per `docs/performance-gates.md` (loaded-machine failures are environmental, never evidence). No throughput, typecheck-budget, or bundle measurement is recorded for this candidate — the table below shows the *thresholds only*. The full gate plus a fresh ≥5-run typecheck calibration are committed to run on the quiet baseline host after the campaign ends, with calibration samples and the gate result recorded separately. Published versions are immutable: if the deferred gate later finds a regression, a successor version supersedes this one — this tarball is never republished.

| Scenario / Metric | Release Floor | Alert Floor | Target | Candidate Measured | Result |
|---|---|---|---|---|---|
| `plain-static` | 30,000 rps | 40,000 rps | 60,000 rps | **DEFERRED rps**  | ⏸ DEFERRED |
| `plain-json` | 25,000 rps | 35,000 rps | 50,000 rps | **DEFERRED rps** | ⏸ DEFERRED |
| `validated-post` | 15,000 rps | 20,000 rps | 30,000 rps | **DEFERRED rps** | ⏸ DEFERRED |
| Typecheck Duration | — | — | < 2500ms | **DEFERREDms** | ⏸ DEFERRED |
| Client Bundle Size | — | — | < 25,000 B | **DEFERRED B** | ⏸ DEFERRED |

---

## 5. Security Architecture & Invariants

- **Redacted Error Policies:** Zero framework leaks in production; custom `onError` and `notFound` policies fail closed to redacted 500/404 Problem Details.
- **Header & Payload Sanitization:** Auth headers, cookies, and internal stacks scrubbed from validation problem details.
- **Prototype Pollution Defense:** Null-prototype objects (`Object.create(null)`) employed across all context dictionary transforms.
- **Deep Immutability:** Guard chains and route descriptor graphs are frozen at app preparation time.

---

## 6. Compatibility & Platform Support

- **Supported Platforms:** Linux x86-64, macOS arm64, Windows x64.
- **Runtime:** Bun 1.4.0 and latest 1.4.x patch release.
- **Type Checking:** TypeScript 7.0.2 pinned strict mode.
- **Validators:** Standard Schema v1 (Zod ^4.4.3, Valibot ^1.4.2, spec 1.1.0 contract).
- **Client Runtime:** Platform-neutral (browser-safe bundle, standalone Node.js compatible without Bun globals).

---

## 7. Supply Chain & Package Verification

- **Production Dependencies:** **0** (zero runtime dependencies).
- **Tarball Entry Count:** **157** files (strict whitelist; no tests/benchmarks/worktrees).
- **Publication Dry-Run:** Validated via `npm publish --dry-run --access public --tag beta`.
- **Artifact Manifest:** Checksums and provenance recorded in `docs/releases/beta/SHA256SUMS`.

---

## 8. Open Limitations & Post-Beta Roadmap

- Node.js runtime for the server core is not supported (Bun-only by design through 1.x).
- Distribution ships module-preserving pre-transpiled ESM (`dist/*.js`) with emitted declaration files (`dist/*.d.ts`); the browser client remains a separate prebuilt artifact (CA-17).
- Real browser automation is not in beta scope (bundle-level graph safety and Node execution proved).

---

## 9. Publication Authorization (Owner Decision)

To publish this release candidate to npm after M8-GATE approval:

```bash
npm publish ./docs/releases/beta/lugas-0.1.0-beta.5.tgz --access public --tag beta
```

*Note: This command must only be executed upon formal owner sign-off.*
