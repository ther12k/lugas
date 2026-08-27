# LugasJS v0.1.0-beta.1 Release Packet

**Candidate Version:** `0.1.0-beta.1`  
**Candidate Commit:** `1ba4e5dd28d7a061de2993fc60aa6de98f58f9eb` (`1ba4e5d`)  
**Generated:** 2026-08-27T03:54:25.852Z  
**Runtime:** Bun 1.4.0 · TypeScript 7.0.2 · Linux x86-64 / macOS arm64 / Windows x64  
**Package:** `lugas` (unscoped) · License: Apache-2.0 · Repo: `ther12k/lugas`

---

## 1. Executive Summary

This packet contains the complete source, package, evidence, and governance artifacts for the **LugasJS v0.1.0-beta.1** release candidate. All milestones (M0–M6) are complete with zero waivers, zero P0/P1 defects, and all performance, security, and compatibility requirements verified.

Publication remains strictly gated on owner approval in **M6-GATE**.

---

## 2. Release Candidate Metadata & Identity

| Attribute | Approved Value | Reference |
|---|---|---|
| Product Name | **LugasJS** (shortened to **Lugas**) | ADR-0001 |
| Package Name | **`lugas`** (unscoped) | ODR-0001 (`docs/owner-decisions/naming-assets.md`) |
| Version | **`0.1.0-beta.1`** | SemVer beta candidate |
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

### M6 Candidate Review Reports
- [`docs/reports/m6-api-freeze.md`](../../reports/m6-api-freeze.md) — Public API candidate freeze
- [`docs/reports/m6-compatibility.md`](../../reports/m6-compatibility.md) — 6-cell CI matrix verification
- [`docs/reports/m6-naming-availability.md`](../../reports/m6-naming-availability.md) — npm namespace and collision review
- [`docs/reports/m6-package-rehearsal.md`](../../reports/m6-package-rehearsal.md) — Publication rehearsal (15/15 checks)
- [`docs/reports/m6-clean-room-agent.md`](../../reports/m6-clean-room-agent.md) — Independent clean-room agent proof
- [`docs/reports/m6-final-verification.md`](../../reports/m6-final-verification.md) — Final candidate evidence aggregation

---

## 4. Performance & Resource Budgets (Release Mode)

| Scenario / Metric | Release Floor | Alert Floor | Target | Candidate Measured | Result |
|---|---|---|---|---|---|
| `plain-static` | 30,000 rps | 40,000 rps | 60,000 rps | **137,238 rps** | ✅ Exceeded |
| `plain-json` | 25,000 rps | 35,000 rps | 50,000 rps | **107,644 rps** | ✅ Exceeded |
| `validated-post` | 15,000 rps | 20,000 rps | 30,000 rps | **66,827 rps** | ✅ Exceeded (11.4% overhead) |
| Typecheck Duration | — | — | < 2,000ms | **833ms** | ✅ Target Met |
| Client Bundle Size | — | — | < 25,000 B | **14,900 B** (~4.1 kB gzip) | ✅ Target Met |

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
- **Tarball File Count:** 69 files (strict whitelist; no tests/benchmarks/worktrees).
- **Publication Dry-Run:** Validated via `npm publish --dry-run --access public --tag beta`.
- **Artifact Manifest:** Checksums and provenance recorded in `docs/releases/beta/SHA256SUMS`.

---

## 8. Open Limitations & Post-Beta Roadmap

- Node.js runtime for the server core is not supported (Bun-only by design through 1.x).
- TypeScript declarations (`.d.ts`) ship as direct `.ts` sources (pre-release packaging posture).
- Real browser automation is not in beta scope (bundle-level graph safety and Node execution proved).

---

## 9. Publication Authorization (Owner Decision)

To publish this release candidate to npm after M6-GATE approval:

```bash
npm publish ./docs/releases/beta/lugas-0.1.0-beta.1.tgz --access public --tag beta
```

*Note: This command must only be executed upon formal owner sign-off.*
