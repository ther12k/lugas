# Proposal — ColorJoy Same-Origin Milestone (M7)

**Status:** Decisions recorded. ADR-0018, ADR-0019 (as amended), ADR-0020, and ADR-0021 were accepted individually on 2026-09-07 — see [ODR-0003](../owner-decisions/colorjoy-adr-approvals.md). ADR files carry `status: accepted`; M7 declaration into the OKF bundle is in progress. The ODR basis note applies throughout: approvals were made against the summarized contracts and probe record; file-level review continues through implementation evidence.

**Driver:** ColorJoy — a same-origin, no-build drawing application served by Lugas. Its workarounds (handwritten static serving, per-app fetch client, manual signal handling) define the acceptance anchors.

**Scope honesty:** this milestone establishes the tested **same-origin browser workflow**. It is not cross-origin CORS coverage and not a claim about a broad browser matrix. CORS remains a separate workstream.

**Verification record (pinned Bun 1.4.0, Linux x86-64, probed 2026-09-06/07)** — cited by the issues below; probe scripts and outputs are archived as deterministic regressions by the owning issues:

| Probe | Result |
|---|---|
| `{ dir }` bare mount | GET/HEAD/POST/PUT/DELETE/OPTIONS all 200 with file contents — method policy **cannot** be delegated to the bare value |
| `{ GET: { dir } }` composition | GET 200, HEAD 200, POST 404 fall-through (runtime-accepted; outside published types) |
| Double-encoded / mixed-encoded traversal | 404 (single percent-decode, contained) |
| Symlink inside served tree → outside file | 404 (link verified resolvable via plain fs; platform-specific, must be tested per supported OS) |
| Oversize body vs `maxRequestBodySize` | bare `413`, empty body, mid-stream, bypasses Lugas error envelope |
| Unhandled handler throw, dev error responses active | 500 HTML ≈50 KB leaking CWD/source |
| Same throw, production mode | minimal 500 (21 bytes, no disclosure) |
| `Bun.file` route value | correct MIME, `Last-Modified`/304, `Range` → 206 |

---

## Sequencing

| Order | Work | Decision boundary |
|---|---|---|
| First | Asset ADR ([ADR-0018](../okf/decisions/0018-opt-in-public-asset-serving.md)) + linked implementation issue (M7-001 draft below) | Owner approves the specific post-freeze addition |
| Alongside design | Existing body-limit regression/doc hardening (M7-002 draft) | Repository's normal rules; no new body API needed |
| First implementation | Asset integration + same-origin browser fixture | Accepted asset contract |
| Next | Application/route body-budget API (M7-003 draft, [ADR-0019](../okf/decisions/0019-body-budget-policy.md)) | Separate API approval; parsing/streaming contract |
| Next | Lifecycle integration (M7-004 draft, [ADR-0020](../okf/decisions/0020-application-service-lifecycle.md)) | Separate lifecycle contract, especially deadline behavior |
| Parallel when authorized | Browser-ready client artifact (M7-005 draft, [ADR-0021](../okf/decisions/0021-prebuilt-browser-client-artifact.md)) | Owning issue for protected package/export changes |

The browser fixture lane does not wait for lifecycle or the client artifact: it starts against ColorJoy's existing `fetch` calls and switches to the packaged client when M7-005 lands. Each change stays independently testable.

---

## M7-001 (draft) — Add opt-in native asset routes with explicit API ownership and safe misses

**Decision:** [ADR-0018](../okf/decisions/0018-opt-in-public-asset-serving.md) — implementation blocked on owner approval.

**Outcome:** an opt-in asset configuration mounts explicit file mappings and directory mounts (explicit prefixes, no root catch-alls) as native Bun route values, with the ownership table, method policy, and security contract frozen as specified in the ADR.

**Acceptance anchor:** ColorJoy removes its custom static-serving implementation (e.g. `server/static.ts`), and its existing API and frontend workflows continue to pass — with no new frontend build requirement.

**Required test groups:**

| Group | Required evidence |
|---|---|
| Routing and methods | Exact/parameter/wildcard overlaps, API misses, unsupported methods, and duplicate declarations follow the approved ownership policy; ambiguous ownership is rejected at startup, not resolved by spread order. **Both mapping forms** (explicit file mappings and directory-prefix mounts) obey the same method contract. **The response, not only its status, is asserted:** HEAD sends no asset body; unsupported methods expose no file bytes and do not reach a different handler returning an application shell. No 405 promise — disallowed methods reach the documented not-found outcome through the assembled routing configuration |
| Native HTTP behavior | MIME types, HEAD, conditional requests, range requests, and missing assets retain the intended native behavior |
| Containment | Encoded traversal, encoded separators, double-encoding cases, symlinks, and case variations are exercised on every platform in the support claim |
| Disclosure | Missing assets never produce the development error page — regression covers both development and production modes; the production-mode regression asserts the intended status and the absence of seeded sensitive details (paths, exception data, source snippets), not Bun's exact error wording or byte count; unexpected errors follow an explicit, sanitized response policy (never indiscriminately disguised as 404) |
| Framework boundaries | Tests/documentation identify whether asset responses participate in guards, response-header policies, diagnostics, and request logging — either integrate those policies or explicitly scope them to API requests; no silent exceptions |
| Consumer integration | The no-build browser fixture loads HTML, JavaScript, and CSS from the application's origin and successfully calls its API (stage one: the application's existing `fetch` calls per ADR-0021 lane independence) |

**Expected files:** new `src/internal/assets*`, `src/core/app.ts` (config validation/classification), new `tests/static/`, new `examples/static/`, `docs/api-reference.md`, `docs/getting-started.md`. **Protected (integrator-owned):** `src/index.ts` (public export), `.github/workflows/*` (per-OS containment lanes). Asset route values stay outside `lugas-manifest-v1` route facts.

---

## M7-002 (draft) — Pin delegated body-limit behavior and document transport-level rejection

**Decision:** none required — existing-behavior hardening under normal repository rules. Can start alongside ADR review.

**Outcome:** the delegated ceiling is discoverable and its observed behavior is pinned by deterministic regressions.

**In scope:**

- Record `maxRequestBodySize` explicitly in `SafeServeOptions` (numeric byte limit), subject to the repository's type-surface rules.
- Deterministic fixtures for: a valid oversized request, a valid streamed request without `Content-Length`, the exact boundary, and proof that rejected requests cannot mutate application state (handler/mutation code never runs).
- Tighten the expected status to bare `413` **for the well-formed oversized fixtures that demonstrably produce it** — do not mechanically replace every `[400, 413, 500]` assertion without checking what each fixture sends. Malformed framing and transport interruptions are separate cases with separate expectations.
- `docs/body-limits.md` updated: the bare `413` is the **observed and pinned transport behavior** — not a Lugas-generated Problem Details response — plus the enforcement-point statement (during consumption, before parsing/handlers).

**Expected files:** `src/internal/prepared-app.ts`, `src/internal/serve.ts`, `tests/security/body-limits.test.ts`, `docs/body-limits.md`.

---

## M7-003 (draft) — Add application-default and route-specific body budgets

**Decision:** [ADR-0019](../okf/decisions/0019-body-budget-policy.md) — **accepted as amended (ODR-0003); this is a separately gated implementation task.** Its API must not enter M7-002, which stays hardening-only. Dispatch waits on the owner's explicit go for the gated implementation.

**Outcome:** `selectedBudget = routeOverride ?? applicationDefault ?? serverCeiling`; `effectiveBudget = min(serverCeiling, selectedBudget)`; `serverCeiling` is the effective Bun ceiling including the runtime default; an explicitly configured budget above the ceiling is **rejected at startup**; with no route budget and no default configured, existing server-ceiling behavior is preserved exactly. Guarantees are split: framework-parsed bodies are enforced during bounded consumption before parsing/handlers; supported raw-stream routes get byte-counted enforcement through the budgeted interface that stops further budgeted reads on overflow (the handler may already have started; earlier side effects are not rolled back; a committed response cannot be promised a replacement Problem Details response). Rejecting budget configuration on unsupported raw paths is a permitted narrower initial implementation; an apparently-active but inert budget is not acceptable. Acceptance includes a Lugas-level rejection exercised with a threshold below Bun's threshold so the framework response path is observed independently of the transport rejection.

**Expected files:** route declaration types, body-parsing path, tests (dual-threshold, exact boundary, override clamping), `docs/body-limits.md`, `docs/api-reference.md`.

---

## M7-004 (draft) — Application service lifecycle and drain-ordered shutdown

**Decision:** [ADR-0020](../okf/decisions/0020-application-service-lifecycle.md) — separate approval. Prerequisite for any production-readiness claim for the planned SSE helper.

**Outcome:** services declare init/dispose; shutdown follows stop-accepting → drain (requests **and tracked application tasks**) under a deadline → reverse-order disposal → failure reporting. The lifecycle distinguishes connection draining, tracked application tasks, cooperative cancellation, and resource disposal; closed sockets are never treated as evidence that application work finished.

**Acceptance interpretation (ODR-0003):** when the deadline expires and tracked work remains, shutdown reports an unsuccessful/incomplete outcome; resources that may still be used by that work are not disposed merely because connections closed. Connection closure, tracked-work completion, and disposal completion are three distinct reported outcomes — not one "stopped" boolean. The guarantee covers tracked work only: detached (unawaited, unregistered) work remains the application's or supervisor's responsibility; no implicit process exit and no general task-orchestration system.

**Required evidence includes the invariant sequence:** handler begins database-dependent work → shutdown deadline expires → connection is forcibly closed → handler attempts to continue. Assertions: the resource is not closed underneath continuing work; the outcome is reported as non-cooperating (never clean success because sockets are gone); shutdown is idempotent; a programmatic stop drives the same path as signals; signal handlers are opt-in (SIGINT/SIGTERM); repeated connect/disconnect/shutdown cycles return resource counts to baseline; startup failure disposes already-initialized services.

**Expected files:** new `src/internal/lifecycle*`, `src/core/app.ts`, `src/internal/serve.ts`, new tests, `docs/api-reference.md`.

---

## M7-005 (draft) — Ship browser-ready client JavaScript

**Decision:** [ADR-0021](../okf/decisions/0021-prebuilt-browser-client-artifact.md) — parallel when authorized; owning issue for protected `package.json` exports and release-pipeline changes.

**Outcome:** the release tarball carries a prebuilt, browser-executable ESM client artifact generated from the same sources as the type contract; no-build browsers consume it via same-origin serving or an import map; `.ts` sources remain the only type source of truth.

**Required evidence:** two distinct browser stages — stage one: plain-JS, no-bundler fixture exercising the application with ordinary `fetch` (browser-to-server behavior); stage two: fixture loading the **shipped artifact** in a real browser with real module resolution and the correct JavaScript MIME type. Final acceptance anchor: the browser loads JavaScript from the installed release artifact, calls the application successfully, and handles the required error and cancellation cases **without rebuilding client source or resolving anything from the source checkout**. The plain-JavaScript demonstration must not require TypeScript configuration; `checkJs` and independent-`tsconfig` type-checking stay separate evidence; graph test proving no server-runtime dependency; **consumer fixture installs the packed artifact into an unrelated temporary directory with the source checkout out of the resolution path** (catches the dependency-location problem class ColorJoy hit); artifact enters the SBOM/attestation inventory and is reproducible from the attested commit.

**Expected files:** `package.json` (protected — single owning issue), release/packaging scripts, new `tests/browser/`, `docs/getting-started.md`, `docs/compatibility.md`.

---

## Explicitly deferred

CORS (separate workstream) · OpenAPI/Scalar · Drizzle adapter · SSE (gated on M7-004) · WebSocket/collaboration helpers · a separate reference application (ColorJoy serves as the real-application fixture) · any change to the Bun 1.4.x support pin.

## Milestone declaration mechanics (owner-directed, per ODR-0003)

Formal declaration splits this document into `docs/okf/issues/m7/` issue files in the house format and extends the issue validator (`scripts/verify-okf.ts`) **mechanically**: admit the intended `M7-*`/`m7` identifiers, preserve existing validation rules and M0–M6 behavior, and do not weaken bundle-link restrictions to accommodate these drafts. Declaration must not auto-accept any ADR — acceptance is recorded individually in ODR-0003. Because a green `verify:docs` does not resolve the plain-text evidence paths referenced from bundle files, declaration includes an explicit existence check of those paths (`docs/reports/m4-test-lifecycle.md`, `docs/reports/m5-cancellation.md`, `docs/reports/m5-native-route-security.md`, `docs/body-limits.md`, `docs/compatibility.md`). GitHub issue filing follows the normal import guide after declaration.
