---
type: Product Backlog
title: LugasJS Prioritized Backlog
status: draft
tags:
- backlog
- github
- tasks
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# LugasJS Prioritized Backlog

Total tasks and gates: **116**.

This file is generated from the canonical issue files. Agents must not edit it to report progress; GitHub issue/PR state is authoritative.

## M0 — Design Freeze and Baselines

| ID | Title | Priority | Size | Area | Kind | Local wave | Depends on |
|---|---|---:|---:|---|---|---:|---|
| [M0-001](../issues/m0/M0-001-freeze-the-design-baseline-and-decision-registry.md) | Freeze the design baseline and decision registry | P0 | S | architecture | docs | 1 | — |
| [M0-002](../issues/m0/M0-002-create-the-repository-skeleton-and-ownership-boundaries.md) | Create the repository skeleton and ownership boundaries | P0 | M | architecture | implementation | 2 | M0-001 |
| [M0-003](../issues/m0/M0-003-pin-bun-typescript-and-the-deterministic-toolchain.md) | Pin Bun, TypeScript, and the deterministic toolchain | P0 | M | packaging | integration | 3 | M0-002 |
| [M0-004](../issues/m0/M0-004-establish-ci-skeleton-and-one-verification-command.md) | Establish CI skeleton and one verification command | P0 | M | ci | integration | 4 | M0-002, M0-003 |
| [M0-005](../issues/m0/M0-005-implement-the-okf-link-and-issue-dependency-validator.md) | Implement the OKF, link, and issue dependency validator | P0 | M | docs | implementation | 4 | M0-002, M0-003 |
| [M0-006](../issues/m0/M0-006-characterize-bun-native-route-and-server-semantics.md) | Characterize Bun native route and server semantics | P0 | L | routing | spike | 4 | M0-003 |
| [M0-007](../issues/m0/M0-007-create-raw-bun-benchmark-fixtures-and-readiness-protocol.md) | Create raw Bun benchmark fixtures and readiness protocol | P0 | M | performance | benchmark | 4 | M0-003 |
| [M0-008](../issues/m0/M0-008-create-an-idiomatic-elysia-2-comparison-fixture.md) | Create an idiomatic Elysia 2 comparison fixture | P1 | M | performance | benchmark | 4 | M0-003 |
| [M0-009](../issues/m0/M0-009-prove-the-route-services-guards-and-client-type-encoding.md) | Prove the route, services, guards, and client type encoding | P0 | L | types | spike | 4 | M0-003 |
| [M0-010](../issues/m0/M0-010-define-malformed-request-and-security-fixture-plan.md) | Define malformed-request and security fixture plan | P0 | M | security | docs | 5 | M0-001, M0-006 |
| [M0-011](../issues/m0/M0-011-install-contribution-and-subagent-worktree-guards.md) | Install contribution and subagent worktree guards | P0 | M | ci | docs | 5 | M0-002, M0-004 |
| [M0-GATE](../issues/m0/M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md) | Verify M0 design, tooling, Bun oracle, and agent readiness | P0 | L | release | gate | 6 | M0-001, M0-002, M0-003, M0-004, M0-005, M0-006, M0-007, M0-008, M0-009, M0-010, M0-011 |

## M1 — Bun-Native Kernel

| ID | Title | Priority | Size | Area | Kind | Local wave | Depends on |
|---|---|---:|---:|---|---|---:|---|
| [M1-001](../issues/m1/M1-001-create-the-core-public-and-internal-type-skeleton.md) | Create the core public and internal type skeleton | P0 | M | core | implementation | 1 | M0-GATE, M0-009 |
| [M1-002](../issues/m1/M1-002-implement-typed-response-branding-and-json.md) | Implement typed response branding and `json` | P0 | M | responses | implementation | 2 | M1-001 |
| [M1-003](../issues/m1/M1-003-implement-text-empty-problem-and-redirect.md) | Implement `text`, `empty`, `problem`, and `redirect` | P0 | M | responses | implementation | 3 | M1-002 |
| [M1-004](../issues/m1/M1-004-implement-the-route-descriptor-factory-and-local-invariants.md) | Implement the route descriptor factory and local invariants | P0 | M | core | implementation | 2 | M1-001 |
| [M1-005](../issues/m1/M1-005-implement-named-guard-descriptors-and-metadata.md) | Implement named guard descriptors and metadata | P0 | M | guards | implementation | 2 | M1-001 |
| [M1-006](../issues/m1/M1-006-implement-named-module-route-containers.md) | Implement named module route containers | P0 | M | core | implementation | 3 | M1-004 |
| [M1-007](../issues/m1/M1-007-implement-the-defineapp-validation-and-composition-shell.md) | Implement the `defineApp` validation and composition shell | P0 | L | core | implementation | 4 | M1-004, M1-005, M1-006 |
| [M1-008](../issues/m1/M1-008-classify-and-preserve-native-bun-route-entries.md) | Classify and preserve native Bun route entries | P0 | L | routing | implementation | 5 | M1-007, M0-006 |
| [M1-009](../issues/m1/M1-009-compile-lugas-descriptors-into-bun-handlers.md) | Compile Lugas descriptors into Bun handlers | P0 | L | routing | implementation | 5 | M1-007 |
| [M1-010](../issues/m1/M1-010-preserve-the-synchronous-route-fast-path.md) | Preserve the synchronous route fast path | P0 | M | performance | implementation | 6 | M1-009 |
| [M1-011](../issues/m1/M1-011-implement-services-and-base-request-context-typing.md) | Implement services and base request context typing | P0 | M | core | implementation | 6 | M1-001, M1-009 |
| [M1-012](../issues/m1/M1-012-reject-duplicate-routes-and-module-ownership-conflicts.md) | Reject duplicate routes and module ownership conflicts | P0 | M | routing | implementation | 5 | M1-006, M1-007 |
| [M1-013](../issues/m1/M1-013-validate-route-path-and-params-declaration-consistency.md) | Validate route path and params declaration consistency | P0 | M | routing | implementation | 5 | M1-004, M1-007 |
| [M1-014](../issues/m1/M1-014-implement-default-not-found-and-unexpected-error-policies.md) | Implement default not-found and unexpected-error policies | P0 | M | responses | implementation | 5 | M1-003, M1-007 |
| [M1-015](../issues/m1/M1-015-implement-app-serve-and-safe-bun-option-passthrough.md) | Implement `app.serve` and safe Bun option passthrough | P0 | L | core | implementation | 6 | M1-008, M1-009, M1-014 |
| [M1-016](../issues/m1/M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md) | Close the M1 kernel conformance and negative-test matrix | P0 | L | testing | test | 7 | M1-002, M1-003, M1-004, M1-005, M1-006, M1-008, M1-009, M1-011, M1-012, M1-013, M1-014, M1-015 |
| [M1-017](../issues/m1/M1-017-build-the-minimal-basic-proof-application.md) | Build the minimal basic proof application | P0 | M | docs | implementation | 7 | M1-003, M1-011, M1-015 |
| [M1-018](../issues/m1/M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md) | Finalize M1 package exports and declaration smoke tests | P0 | M | packaging | integration | 7 | M1-001, M1-002, M1-003, M1-004, M1-005, M1-006, M1-007, M1-015 |
| [M1-GATE](../issues/m1/M1-GATE-verify-the-bun-native-kernel-and-response-contract.md) | Verify the Bun-native kernel and response contract | P0 | L | release | gate | 8 | M1-001, M1-002, M1-003, M1-004, M1-005, M1-006, M1-007, M1-008, M1-009, M1-010, M1-011, M1-012, M1-013, M1-014, M1-015, M1-016, M1-017, M1-018 |

## M2 — Validation and Guards

| ID | Title | Priority | Size | Area | Kind | Local wave | Depends on |
|---|---|---:|---:|---|---|---:|---|
| [M2-001](../issues/m2/M2-001-implement-the-standard-schema-executor-and-dependency-decision.md) | Implement the Standard Schema executor and dependency decision | P0 | L | validation | implementation | 1 | M1-GATE |
| [M2-002](../issues/m2/M2-002-normalize-validation-issues-safely.md) | Normalize validation issues safely | P0 | M | validation | implementation | 2 | M2-001, M1-003 |
| [M2-003](../issues/m2/M2-003-add-params-validation-and-transformed-output.md) | Add params validation and transformed output | P0 | M | validation | implementation | 2 | M2-001, M1-013 |
| [M2-004](../issues/m2/M2-004-define-and-implement-deterministic-query-decoding.md) | Define and implement deterministic query decoding | P0 | M | validation | implementation | 1 | M1-GATE, M0-006 |
| [M2-005](../issues/m2/M2-005-add-query-validation-and-inferred-output.md) | Add query validation and inferred output | P0 | M | validation | implementation | 2 | M2-001, M2-004 |
| [M2-006](../issues/m2/M2-006-add-lower-case-header-projection-and-validation.md) | Add lower-case header projection and validation | P0 | M | validation | implementation | 2 | M2-001 |
| [M2-007](../issues/m2/M2-007-implement-json-media-type-and-malformed-body-parsing-policy.md) | Implement JSON media-type and malformed-body parsing policy | P0 | L | validation | implementation | 1 | M1-GATE, M0-010 |
| [M2-008](../issues/m2/M2-008-add-json-body-validation-and-transformed-output.md) | Add JSON body validation and transformed output | P0 | M | validation | implementation | 2 | M2-001, M2-007 |
| [M2-009](../issues/m2/M2-009-unify-request-validation-problem-details-mapping.md) | Unify request validation Problem Details mapping | P0 | M | validation | implementation | 3 | M2-002, M2-003, M2-005, M2-006, M2-008 |
| [M2-010](../issues/m2/M2-010-execute-guards-with-sync-path-and-response-short-circuit.md) | Execute guards with sync path and response short-circuit | P0 | L | guards | implementation | 1 | M1-GATE, M1-005, M1-009 |
| [M2-011](../issues/m2/M2-011-propagate-typed-guard-context-enrichment.md) | Propagate typed guard context enrichment | P0 | L | guards | implementation | 2 | M2-010, M1-011, M0-009 |
| [M2-012](../issues/m2/M2-012-merge-guard-short-circuit-responses-into-route-contracts.md) | Merge guard short-circuit responses into route contracts | P0 | L | types | implementation | 2 | M2-010, M1-002, M0-009 |
| [M2-013](../issues/m2/M2-013-close-multi-guard-ordering-collision-and-failure-semantics.md) | Close multi-guard ordering, collision, and failure semantics | P0 | M | guards | test | 3 | M2-010, M2-011, M2-012 |
| [M2-014](../issues/m2/M2-014-compose-the-validation-and-guard-request-pipeline.md) | Compose the validation and guard request pipeline | P0 | L | routing | implementation | 4 | M2-003, M2-005, M2-006, M2-008, M2-013 |
| [M2-015](../issues/m2/M2-015-document-and-test-request-body-limits-and-native-passthrough.md) | Document and test request body limits and native passthrough | P0 | M | security | test | 2 | M2-007, M1-015 |
| [M2-016](../issues/m2/M2-016-build-validation-and-guard-proof-applications.md) | Build validation and guard proof applications | P0 | M | docs | implementation | 5 | M2-014 |
| [M2-017](../issues/m2/M2-017-run-malformed-request-and-adversarial-validation-matrix.md) | Run malformed-request and adversarial validation matrix | P0 | L | security | security | 5 | M2-009, M2-014, M0-010 |
| [M2-018](../issues/m2/M2-018-close-route-context-and-guard-type-tests.md) | Close route-context and guard type tests | P0 | L | types | test | 5 | M2-011, M2-012, M2-014 |
| [M2-GATE](../issues/m2/M2-GATE-verify-validation-guards-security-and-context-contracts.md) | Verify validation, guards, security, and context contracts | P0 | L | release | gate | 6 | M2-001, M2-002, M2-003, M2-004, M2-005, M2-006, M2-007, M2-008, M2-009, M2-010, M2-011, M2-012, M2-013, M2-014, M2-015, M2-016, M2-017, M2-018 |

## M3 — Typed Contract and Client

| ID | Title | Priority | Size | Area | Kind | Local wave | Depends on |
|---|---|---:|---:|---|---|---:|---|
| [M3-001](../issues/m3/M3-001-extract-the-application-route-contract-type.md) | Extract the application route contract type | P0 | L | types | implementation | 1 | M2-GATE, M1-GATE, M0-009 |
| [M3-002](../issues/m3/M3-002-derive-method-specific-path-and-input-lookup-types.md) | Derive method-specific path and input lookup types | P0 | L | types | implementation | 2 | M3-001, M2-GATE |
| [M3-003](../issues/m3/M3-003-extract-status-and-body-response-unions.md) | Extract status and body response unions | P0 | L | types | implementation | 2 | M3-001, M1-003 |
| [M3-004](../issues/m3/M3-004-merge-guard-responses-into-client-outcome-types.md) | Merge guard responses into client outcome types | P0 | M | types | implementation | 3 | M3-003, M2-012 |
| [M3-005](../issues/m3/M3-005-generate-25-100-500-and-1-000-route-type-fixtures.md) | Generate 25, 100, 500, and 1,000 route type fixtures | P0 | M | types | benchmark | 2 | M3-001 |
| [M3-006](../issues/m3/M3-006-implement-createclient-base-configuration-and-fetch-injection.md) | Implement `createClient` base configuration and fetch injection | P0 | M | client | implementation | 3 | M3-002 |
| [M3-007](../issues/m3/M3-007-add-typed-explicit-http-methods-and-path-restrictions.md) | Add typed explicit HTTP methods and path restrictions | P0 | M | client | implementation | 4 | M3-002, M3-006 |
| [M3-008](../issues/m3/M3-008-implement-path-parameter-interpolation-and-encoding.md) | Implement path-parameter interpolation and encoding | P0 | M | client | implementation | 5 | M3-007 |
| [M3-009](../issues/m3/M3-009-implement-query-serialization-matching-server-decoding.md) | Implement query serialization matching server decoding | P0 | M | client | implementation | 5 | M3-007, M2-004 |
| [M3-010](../issues/m3/M3-010-implement-headers-json-body-and-requestinit-merging.md) | Implement headers, JSON body, and RequestInit merging | P0 | L | client | implementation | 5 | M3-007, M2-007 |
| [M3-011](../issues/m3/M3-011-parse-http-responses-into-discriminated-client-results.md) | Parse HTTP responses into discriminated client results | P0 | L | client | implementation | 5 | M3-003, M3-007 |
| [M3-012](../issues/m3/M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md) | Freeze JSON, text, empty, problem, and decode-failure semantics | P0 | L | client | implementation | 6 | M3-011, M1-003 |
| [M3-013](../issues/m3/M3-013-preserve-network-abort-and-raw-fetch-failure-behavior.md) | Preserve network, abort, and raw fetch failure behavior | P0 | M | client | implementation | 6 | M3-011 |
| [M3-014](../issues/m3/M3-014-prove-the-client-export-is-browser-safe-and-bun-free.md) | Prove the client export is browser-safe and Bun-free | P0 | M | packaging | test | 7 | M3-006, M3-007, M3-008, M3-009, M3-010, M3-011, M3-012, M3-013 |
| [M3-015](../issues/m3/M3-015-close-the-client-unit-and-adversarial-matrix.md) | Close the client unit and adversarial matrix | P0 | L | testing | test | 7 | M3-008, M3-009, M3-010, M3-011, M3-012, M3-013 |
| [M3-016](../issues/m3/M3-016-prove-full-server-to-client-contract-behavior.md) | Prove full server-to-client contract behavior | P0 | L | testing | integration | 8 | M2-GATE, M3-015 |
| [M3-017](../issues/m3/M3-017-establish-the-typescript-performance-gate-and-fallback-policy.md) | Establish the TypeScript performance gate and fallback policy | P0 | L | types | benchmark | 5 | M3-004, M3-005, M3-007 |
| [M3-018](../issues/m3/M3-018-finalize-lugas-client-exports-and-packed-consumer-tests.md) | Finalize `lugas/client` exports and packed consumer tests | P0 | M | packaging | integration | 8 | M3-014, M3-017 |
| [M3-GATE](../issues/m3/M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md) | Verify end-to-end client types, runtime behavior, and type cost | P0 | L | release | gate | 9 | M3-001, M3-002, M3-003, M3-004, M3-005, M3-006, M3-007, M3-008, M3-009, M3-010, M3-011, M3-012, M3-013, M3-014, M3-015, M3-016, M3-017, M3-018 |

## M4 — Manifest, Tooling, and Agent DX

| ID | Title | Priority | Size | Area | Kind | Local wave | Depends on |
|---|---|---:|---:|---|---|---:|---|
| [M4-001](../issues/m4/M4-001-freeze-the-runtime-manifest-v1-schema-and-stability-policy.md) | Freeze the runtime manifest v1 schema and stability policy | P0 | M | manifest | docs | 1 | M3-GATE, M1-GATE |
| [M4-002](../issues/m4/M4-002-capture-module-path-method-and-route-kind-metadata.md) | Capture module, path, method, and route-kind metadata | P0 | M | manifest | implementation | 2 | M4-001, M1-007 |
| [M4-003](../issues/m4/M4-003-capture-validation-capabilities-and-ordered-guard-names-truthfully.md) | Capture validation capabilities and ordered guard names truthfully | P0 | M | manifest | implementation | 3 | M4-002, M2-GATE |
| [M4-004](../issues/m4/M4-004-expose-readonly-app-manifest-and-deterministic-json.md) | Expose readonly `app.manifest` and deterministic JSON | P0 | M | manifest | implementation | 4 | M4-003 |
| [M4-005](../issues/m4/M4-005-create-the-stable-diagnostic-catalog-and-formatter.md) | Create the stable diagnostic catalog and formatter | P0 | L | manifest | implementation | 1 | M3-GATE, M1-012, M2-009 |
| [M4-006](../issues/m4/M4-006-implement-the-bun-native-test-server-lifecycle-helper.md) | Implement the Bun-native test server lifecycle helper | P0 | L | testing | implementation | 1 | M3-GATE, M1-015 |
| [M4-007](../issues/m4/M4-007-integrate-the-typed-client-with-the-test-server-helper.md) | Integrate the typed client with the test server helper | P0 | M | testing | implementation | 2 | M4-006, M3-GATE |
| [M4-008](../issues/m4/M4-008-close-test-server-cleanup-failure-and-leak-behavior.md) | Close test-server cleanup, failure, and leak behavior | P0 | M | testing | test | 2 | M4-006 |
| [M4-009](../issues/m4/M4-009-lock-diagnostic-and-manifest-golden-contracts.md) | Lock diagnostic and manifest golden contracts | P0 | M | testing | test | 5 | M4-004, M4-005 |
| [M4-010](../issues/m4/M4-010-spike-safe-application-import-for-cli-inspection.md) | Spike safe application import for CLI inspection | P0 | L | cli | spike | 5 | M4-004 |
| [M4-011](../issues/m4/M4-011-implement-lugas-routes-and-lugas-inspect-json.md) | Implement `lugas routes` and `lugas inspect --json` | P0 | L | cli | implementation | 6 | M4-010 |
| [M4-012](../issues/m4/M4-012-test-cli-no-server-start-timeout-and-process-exit-guarantees.md) | Test CLI no-server-start, timeout, and process-exit guarantees | P0 | M | cli | security | 7 | M4-011 |
| [M4-013](../issues/m4/M4-013-create-canonical-basic-validation-auth-and-client-examples.md) | Create canonical basic, validation, auth, and client examples | P0 | L | docs | docs | 3 | M2-GATE, M3-GATE, M4-007 |
| [M4-014](../issues/m4/M4-014-generate-concise-llms-txt-from-canonical-concepts.md) | Generate concise `llms.txt` from canonical concepts | P0 | M | docs | docs | 4 | M4-013 |
| [M4-015](../issues/m4/M4-015-generate-full-agent-reference-and-lugas-skill-document.md) | Generate full agent reference and Lugas skill document | P0 | L | docs | docs | 5 | M4-014 |
| [M4-016](../issues/m4/M4-016-finalize-repository-agents-and-evidence-enforcement.md) | Finalize repository AGENTS and evidence enforcement | P0 | M | docs | integration | 4 | M4-005, M4-013 |
| [M4-017](../issues/m4/M4-017-finalize-lugas-testing-and-cli-package-exports.md) | Finalize `lugas/testing` and CLI package exports | P0 | M | packaging | integration | 7 | M4-007, M4-008, M4-011 |
| [M4-GATE](../issues/m4/M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md) | Verify manifest truth, testing, CLI, examples, and agent documentation | P0 | L | release | gate | 8 | M4-001, M4-002, M4-003, M4-004, M4-005, M4-006, M4-007, M4-008, M4-009, M4-010, M4-011, M4-012, M4-013, M4-014, M4-015, M4-016, M4-017 |

## M5 — Hardening and Private Alpha

| ID | Title | Priority | Size | Area | Kind | Local wave | Depends on |
|---|---|---:|---:|---|---|---:|---|
| [M5-001](../issues/m5/M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md) | Freeze benchmark harness methodology and environment manifest | P0 | L | performance | benchmark | 1 | M4-GATE, M0-007, M0-008, M1-GATE |
| [M5-002](../issues/m5/M5-002-measure-raw-bun-versus-lugas-plain-route-overhead.md) | Measure raw Bun versus Lugas plain-route overhead | P0 | L | performance | benchmark | 2 | M5-001, M2-GATE |
| [M5-003](../issues/m5/M5-003-measure-feature-equivalent-validation-and-guard-pipelines.md) | Measure feature-equivalent validation and guard pipelines | P0 | L | performance | benchmark | 2 | M5-001, M2-GATE |
| [M5-004](../issues/m5/M5-004-measure-1-000-and-10-000-route-startup-and-memory.md) | Measure 1,000 and 10,000 route startup and memory | P0 | L | performance | benchmark | 2 | M5-001, M1-GATE |
| [M5-005](../issues/m5/M5-005-measure-client-bundle-and-typescript-contract-cost.md) | Measure client bundle and TypeScript contract cost | P0 | L | performance | benchmark | 2 | M5-001, M3-GATE |
| [M5-006](../issues/m5/M5-006-integrate-bun-cpu-heap-and-metafile-diagnostics.md) | Integrate Bun CPU, heap, and metafile diagnostics | P0 | M | performance | benchmark | 2 | M5-001, M4-GATE |
| [M5-007](../issues/m5/M5-007-install-performance-size-and-type-regression-gates.md) | Install performance, size, and type regression gates | P0 | L | performance | integration | 3 | M5-002, M5-003, M5-004, M5-005, M5-006 |
| [M5-008](../issues/m5/M5-008-perform-the-full-malformed-input-and-redaction-security-review.md) | Perform the full malformed-input and redaction security review | P0 | L | security | security | 1 | M4-GATE, M2-017, M4-005 |
| [M5-009](../issues/m5/M5-009-audit-dependencies-licenses-package-contents-and-sbom.md) | Audit dependencies, licenses, package contents, and SBOM | P0 | L | security | security | 1 | M4-GATE, M1-018, M3-018, M4-017 |
| [M5-010](../issues/m5/M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-windows.md) | Run Bun 1.4.x compatibility on Linux, macOS, and Windows | P0 | L | ci | integration | 1 | M0-004, M4-GATE |
| [M5-011](../issues/m5/M5-011-close-static-file-directory-and-native-passthrough-security-tests.md) | Close static, file, directory, and native passthrough security tests | P0 | M | security | test | 1 | M4-GATE, M1-008, M0-006 |
| [M5-012](../issues/m5/M5-012-stress-synchronous-and-asynchronous-guards-and-validators.md) | Stress synchronous and asynchronous guards and validators | P0 | L | testing | test | 1 | M4-GATE, M2-GATE |
| [M5-013](../issues/m5/M5-013-stress-cancellation-abort-slow-bodies-and-client-transport.md) | Stress cancellation, abort, slow bodies, and client transport | P0 | L | security | test | 1 | M4-GATE, M2-GATE, M3-013 |
| [M5-014](../issues/m5/M5-014-run-10-000-route-runtime-and-type-stress-closure.md) | Run 10,000-route runtime and type stress closure | P0 | L | performance | benchmark | 3 | M3-017, M5-004 |
| [M5-015](../issues/m5/M5-015-review-api-consistency-against-principles-and-elysia-lessons.md) | Review API consistency against principles and Elysia lessons | P0 | L | architecture | docs | 1 | M4-GATE |
| [M5-016](../issues/m5/M5-016-build-the-production-shaped-crud-proof-api.md) | Build the production-shaped CRUD proof API | P0 | L | testing | implementation | 1 | M4-GATE, M4-013 |
| [M5-017](../issues/m5/M5-017-assemble-the-private-alpha-review-and-release-packet.md) | Assemble the private alpha review and release packet | P0 | L | release | release | 4 | M5-002, M5-003, M5-004, M5-005, M5-007, M5-008, M5-009, M5-010, M5-011, M5-012, M5-013, M5-014, M5-015, M5-016 |
| [M5-GATE](../issues/m5/M5-GATE-verify-private-alpha-hardening-and-evidence.md) | Verify private alpha hardening and evidence | P0 | L | release | gate | 5 | M5-001, M5-002, M5-003, M5-004, M5-005, M5-006, M5-007, M5-008, M5-009, M5-010, M5-011, M5-012, M5-013, M5-014, M5-015, M5-016, M5-017 |

## M6 — Beta Stabilization and Release

| ID | Title | Priority | Size | Area | Kind | Local wave | Depends on |
|---|---|---:|---:|---|---|---:|---|
| [M6-001](../issues/m6/M6-001-freeze-the-beta-public-api-candidate-and-deprecation-policy.md) | Freeze the beta public API candidate and deprecation policy | P0 | L | architecture | docs | 1 | M5-GATE |
| [M6-002](../issues/m6/M6-002-complete-raw-bun-and-elysia-migration-adoption-documentation.md) | Complete raw Bun and Elysia migration/adoption documentation | P0 | L | docs | docs | 1 | M5-GATE, M5-015, M5-016 |
| [M6-003](../issues/m6/M6-003-run-package-publication-dry-run-and-provenance-rehearsal.md) | Run package publication dry-run and provenance rehearsal | P0 | L | packaging | release | 1 | M5-GATE, M5-009, M5-017 |
| [M6-004](../issues/m6/M6-004-resolve-package-repository-organization-and-domain-ownership.md) | Resolve package, repository, organization, and domain ownership | P0 | M | release | release | 1 | M5-GATE |
| [M6-005](../issues/m6/M6-005-resolve-final-license-and-initial-governance.md) | Resolve final license and initial governance | P0 | M | release | release | 1 | M5-GATE |
| [M6-006](../issues/m6/M6-006-finalize-the-supported-bun-1-4-compatibility-matrix.md) | Finalize the supported Bun 1.4 compatibility matrix | P0 | M | ci | integration | 1 | M5-GATE, M5-010 |
| [M6-007](../issues/m6/M6-007-triage-all-defects-and-enforce-zero-p0-p1-beta-gate.md) | Triage all defects and enforce zero P0/P1 beta gate | P0 | M | release | release | 1 | M5-GATE |
| [M6-008](../issues/m6/M6-008-run-an-independent-clean-room-agent-implementation-and-review.md) | Run an independent clean-room agent implementation and review | P0 | L | docs | test | 1 | M5-GATE, M4-015, M5-016 |
| [M6-009](../issues/m6/M6-009-rerun-final-security-performance-type-and-package-evidence.md) | Rerun final security, performance, type, and package evidence | P0 | L | release | integration | 2 | M6-001, M6-006, M6-007 |
| [M6-010](../issues/m6/M6-010-assemble-the-v0-1-0-beta-1-release-packet.md) | Assemble the v0.1.0-beta.1 release packet | P0 | L | release | release | 3 | M6-002, M6-003, M6-004, M6-005, M6-008, M6-009 |
| [M6-GATE](../issues/m6/M6-GATE-approve-or-reject-the-v0-1-0-beta-1-release-candidate.md) | Approve or reject the v0.1.0-beta.1 release candidate | P0 | L | release | gate | 4 | M6-001, M6-002, M6-003, M6-004, M6-005, M6-006, M6-007, M6-008, M6-009, M6-010 |
