---
type: Design Proposal (pre-decision)
title: Core and Middleware Boundaries — Lugas Lightweight-Surface Proposal
status: draft-for-owner-review (no implementation authorized)
date: 2026-09-20
base-commit: 134f163
issue: ID owner-assigned at dispatch
governing-adr: ADR-0012 (one package with subpath exports)
---

# Core and middleware boundaries — design proposal

Owner framing (2026-09-20): prioritize lower memory usage, faster startup,
and essential features that are easy to add — not the highest rps number.
This proposal inventories what exists at `134f163`, proposes where each
capability belongs (core / optional import / separate package), verifies the
owner-specified reference app assembles from the public surface today, and
records resource-efficiency questions as hypotheses for the established
measurement procedures. **Nothing here authorizes moving code, changing
exports, or publishing packages; the beta.6 freeze at `134f163`, PR #437,
the benchmark harness, and all release budgets are untouched.**

## 1. Executive recommendation

1. **Keep ADR-0012 through 0.1.x: one package with subpath exports.** No
   `@lugas/*` now. Package splits trade "lightweight" for version skew,
   release chore, and discovery cost; none of the split criteria (own
   dependencies, independent release cadence, separate ownership, measured
   cost when unused) is met by any current capability. Revisit only with
   measurement evidence (§6).
2. **Do not add a middleware abstraction.** Lugas's answer to "middleware"
   is already three explicit, statically searchable mechanisms: **guards**
   (request gating + context enrichment), **lifecycle config**
   (`cors`, `secureHeaders`, `health`, `compression`, `etag`, `logging`,
   `telemetry`, `openapi`, `spa` — opt-in keys compiled at startup, unknown
   keys rejected via `LUGAS_APP_002`), and **route `before` chains**. An
   `app.use()`-style chain would be a fourth overlapping mechanism and a
   governance change (AGENTS architecture rules), not a lightweighting.
   What the ecosystem calls middleware should ship as *recipes*
   (documented guard/lifecycle compositions), not framework surface.
3. **`@lugas/jwt` conflicts with standing first-party non-goals** (JWT,
   password/OAuth/passkey auth; roadmap stop-rule). Auth stays application-
   side: the cookie-session guard pattern plus the Better Auth recipe
   (ADR-0027) are the documented path. Do not create it.
4. **CORS is not missing.** It exists today as `cors?: CorsConfig`
   (origin allowlist/callback, methods, headers, credentials, maxAge),
   compiled once at startup — pay-per-enable. The packaging question is
   independent of existence; today it answers "core config" (§4).
5. **Capability subpaths (`lugas/openapi`, `lugas/cors`, …)** remain a
   post-0.1.0 program item per the owner's 2026-09-15 disposition — decided
   then, with the S1/S2 harness supplying the measured per-capability cost
   this proposal only hypothesizes (§6).

## 2. Inventory of the public surface (verified at 134f163)

Packaging facts: single package `lugas`; subpaths `.`, `./client`,
`./client/browser`, `./drizzle`, `./testing`; **zero runtime and zero peer
dependencies** (zod/valibot/drizzle/OTel are devDependencies — Standard
Schema keeps schema libs app-owned; the drizzle adapter never imports
drizzle-orm per ADR-0026). Raw TypeScript resolves by default on Bun;
`--conditions=lugas-dist` selects the emitted JS (dual distribution).

| Group | Public surface | Cost model |
|---|---|---|
| App core | `defineApp`, `route`, `guard`, `service`, `defineModule`, `bindServices`, `AppContract` | always loaded; the small core |
| Responses | `json`/`text`/`empty`/`redirect`/`problem` (+ typed-client status unions incl. 422/415/400) | always loaded |
| Validation | params/query/headers/body slots accepting any Standard Schema | app-owned schema lib; no framework dep |
| Lifecycle config | `cors`, `secureHeaders`, `health`, `compression`, `etag`, `logging`, `telemetry`, `openapi` (+Scalar), `spa` | opt-in keys, compiled at startup; absent = no work |
| Protocol routes | `sse`, `websocket`, `form` (bounded multipart), `bodyBudget` | per-route opt-in |
| Primitives | `cookie`/`parseCookies`, `rateLimit` + `createMemoryRateLimitStore` (app-owned stores) | guards/config; memory store is a development reference (ADR-0034) |
| Subpath runtimes | `lugas/client` (typed, browser-safe; `lugas/client/browser` ESM build), `lugas/drizzle` (adapter), `lugas/testing` | strict runtime boundaries per ADR-0012 |

## 3. Boundary framework

For each capability, answer four questions before choosing packaging:

1. **Does it need its own dependencies?** (version skew enters the user's
   graph; today only `lugas/drizzle` has a peer-ish relationship, and it
   deliberately imports nothing from it)
2. **Does it need its own release cadence or ownership?** (a security fix
   in CORS should not wait behind an app-core release — but today the whole
   surface is small enough to release atomically with strong evidence)
3. **Does enabling it impose measurable startup/memory cost when unused?**
   (config-compiled capabilities cost nothing when the key is absent; the
   honest unknown is *import-time* cost of the single index — §6 H2)
4. **Is it a product non-goal?** (auth products, backends, caches — the
   roadmap's standing list; adapters-not-backends per ADR-0026)

Outcomes: **core config** (status quo), **subpath** (`lugas/x` — same
package, import-time isolation, ADR-0012's existing mechanism), or
**separate package** (`@lugas/x` — requires an ADR-0012 amendment and an
owner package-name decision; AGENTS reserves package creation to the owner).

## 4. Classification (proposal)

| Capability | Verdict | Rationale |
|---|---|---|
| cors, secureHeaders, health, etag | core config | tiny, dependency-free, compiled at startup; splitting adds chore, removes nothing |
| compression, logging, telemetry | core config | same; telemetry is scalar-facts-only by design (ADR-0032), no OTel dependency to isolate |
| openapi + Scalar UI | core config now; subpath candidate post-0.1.0 | the one capability with meaningful doc/UI weight; owner already parked the capability-subpath program there |
| spa, assets | core config | file/lifecycle integration is app-core adjacent (ADR-0018/0037) |
| sse, websocket, form | core (per-route) | protocol routes are the product; not middleware |
| rateLimit + stores | core contract; stores stay recipes | ADR-0034: application-owned storage; a first-party Redis store package would violate the no-cache-backends non-goal — publish recipes instead |
| client / drizzle / testing | existing subpaths | already the ADR-0012 boundary; no change |
| sql/redis/s3 service adapters | post-0.1.0, ODR-0019 phase 3 | adapters-not-backends precedent; not started here |
| JWT / auth product | non-goal | standing roadmap non-goal; `@lugas/jwt` should not exist |
| `create-lugas` + official starters | post-0.1.0 phase 2 | already decided (ADR-0012 amendment grounds); untouched here |

## 5. Reference application probe (owner-specified)

`docs/proposals/drafts/task-api-draft.ts` implements the specified app —
public health, authenticated task routes, validation, consistent errors,
browser access via CORS — **using only public exports at `134f163`. The
verified outcome: zero proposed APIs were required** (the file contains no
`[PROPOSED]` markers because none were needed). Assemble-verification
(scratch harness, ephemeral port, DX evidence only — not a performance
measurement): 16/16 checks pass — CORS preflight (origin echo +
credentials), public `/health` + `/ready`, anonymous 401 Problem, login
(HttpOnly cookie) + 429 with Retry-After on the 7th attempt, validated
create 201, empty-title 422 Problem, complete 200, unknown-id 404, delete
204, not-found Problem, logout expiry.

DX observations while drafting (honest, small):

- Assembly needs no hidden conventions: every behavior is one explicit
  config key, guard, or schema slot; the AI-agent assembling this had the
  whole app in one screenful.
- Remaining friction is already recorded in the dogfood register:
  RF-5 (typed-client cookie guidance — the draft uses the documented
  declare-a-cookie-header-schema pattern) and RF-4 (`{ headers: {} }` idiom
  documentation) are docs-candidate follow-ups, not API gaps.
- The rate-limit + session-guard + CORS combination read naturally as
  *config + guards*, reinforcing §1.2: recipes, not a middleware layer.

## 6. Resource-efficiency hypotheses (recorded, not measured)

No new measurements were taken (host is busy; release budgets unchanged).
Hypotheses for the established procedures to answer later:

- **H1 (startup)**: raw-TS import of the single `lugas` index stays within
  the release startup budget for minimal apps, and lifecycle keys add ~0
  when absent. *Procedure: lane A minimal-vs-validated profiles (already
  frozen) on the S1/S2 harness.*
- **H2 (import weight)**: import-time cost of the monolithic index is
  dominated by the runtime actually loading modules; if a capability
  subpath program shows measurable per-capability import cost, that is the
  evidence that would justify `lugas/openapi`-style splits. *Procedure:
  same lane A comparison, per-capability deltas.*
- **H3 (idle memory)**: idle RSS is driven by Bun + the app's own schema/
  store choices, not by disabled lifecycle keys. *Procedure: lane A RSS
  rows (minimal vs validated).*
- **H4 (per-feature increment)**: enabling compression+etag+openapi+logging
  together costs a quantifiable, disclosable increment — the number the
  public "CPU ms / 1,000 requests" story eventually cites. *Procedure:
  lane B/C on qualified hosts.*
- **H5 (client weight)**: the `lugas/client/browser` ESM build remains
  small enough that a separate client package is never justified by
  browser weight alone. *Procedure: bundle-size disclosure alongside H2.*

These are hypotheses, not targets: no budget, threshold, or claim changes.

## 7. Governance path

- **Through 0.1.0** (ODR-0018 stop-rule): this proposal is permitted design
  documentation; nothing implements. The beta.6 sequence proceeds first
  (`check beta6 readiness` → attestation → publication boundary).
- **Post-0.1.0**, in roadmap order: capability-subpath program decided with
  §6 evidence; service adapters (ODR-0019 phase 3); `create-lugas` +
  starters (phase 2 — sequencing per the adopted program).
- Any export addition or package creation needs its owning issue, an ADR
  (ADR-0012 amendment where packaging changes), and an explicit owner
  package-name decision. The draft file stays under `docs/proposals/` —
  it is not an example, is not catalog-linked, and joins `examples/` only
  if the owner dispatches that as implementation.
