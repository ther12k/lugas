# LugasJS v0.1.0-beta.1 Evidence Index

**Candidate Version:** `0.1.0-beta.1`  
**Candidate Commit:** `73337b3`  
**Generated:** 2026-08-27  
**Bun:** 1.4.0 · TypeScript: 7.0.2 · OS: linux-x64 / macOS arm64 / Windows x64

---

## 1. Milestone Gate Reports

| Gate | Title | Status | Report Link |
|---|---|---|---|
| M0 | Foundations, harness, baseline types | PASS | [`docs/reports/gates/M0.md`](../../reports/gates/M0.md) |
| M1 | Core routing, handlers, error policies | PASS | [`docs/reports/gates/M1.md`](../../reports/gates/M1.md) |
| M2 | Standard Schema validation & guards | PASS | [`docs/reports/gates/M2.md`](../../reports/gates/M2.md) |
| M3 | Typed client & testing subpaths | PASS | [`docs/reports/gates/M3.md`](../../reports/gates/M3.md) |
| M4 | Manifest truthfulness & CLI inspection | PASS | [`docs/reports/gates/M4.md`](../../reports/gates/M4.md) |
| M4R1 | Review corrections & context invariants | PASS | [`docs/reports/gates/M4R1-GATE.md`](../../reports/gates/M4R1-GATE.md) |
| M5 | Private alpha hardening & benchmarks | PASS | [`docs/reports/gates/M5.md`](../../reports/gates/M5.md) |
| M5R1 | Independent review corrections | PASS | [`docs/reports/gates/M5R1-GATE.md`](../../reports/gates/M5R1-GATE.md) |

---

## 2. M6 Release & Candidate Reports

| Topic | Report Link | Summary |
|---|---|---|
| API Freeze | [`docs/reports/m6-api-freeze.md`](../../reports/m6-api-freeze.md) | Public exports locked; no internal leakage |
| Compatibility | [`docs/reports/m6-compatibility.md`](../../reports/m6-compatibility.md) | 6/6 matrix cells green (Ubuntu/macOS/Windows × Bun 1.4) |
| Naming & Assets | [`docs/reports/m6-naming-availability.md`](../../reports/m6-naming-availability.md) | npm `lugas` available (404); low collision risk |
| Package Rehearsal | [`docs/reports/m6-package-rehearsal.md`](../../reports/m6-package-rehearsal.md) | 15/15 checks green; dry-run publish validated |
| Clean-Room Agent | [`docs/reports/m6-clean-room-agent.md`](../../reports/m6-clean-room-agent.md) | Multi-tenant billing app built from docs (8/8 pass) |
| Final Verification | [`docs/reports/m6-final-verification.md`](../../reports/m6-final-verification.md) | Performance budgets met; 0 open P0/P1 defects |

---

## 3. Owner Decision Records

| Decision | Topic | Status | Record Link |
|---|---|---|---|
| ODR-0001 | Package, repository, and brand asset identity | ACCEPTED | [`docs/owner-decisions/naming-assets.md`](../../owner-decisions/naming-assets.md) |
| ODR-0002 | Apache-2.0 license, notices, and governance | ACCEPTED | [`docs/owner-decisions/license-governance.md`](../../owner-decisions/license-governance.md) |

---

## 4. Release Artifacts (`docs/releases/beta/`)

- `lugas-0.1.0-beta.1.tgz` (exact packed tarball, sha256 checksum recorded in `SHA256SUMS`)
- `SHA256SUMS` (cryptographic manifest of release artifacts)
- `sbom.json` (Software Bill of Materials — 0 production dependencies)
- `provenance.json` (build provenance statement bound to candidate commit)
- `inventory.json` (69 file inventory of the candidate tarball)
