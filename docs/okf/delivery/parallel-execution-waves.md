---
type: Execution Plan
title: Parallel Subagent Execution Waves
status: draft
tags:
- parallel
- subagents
- waves
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Parallel Execution Waves

A shared wave means dependencies allow parallel execution; it is not permission to ignore conflict groups or owned-file overlap.

## M0 — Design Freeze and Baselines

### Wave 1

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M0-001](../issues/m0/M0-001-freeze-the-design-baseline-and-decision-registry.md) | architecture | `docs-baseline` | — | candidate; check file overlap |

### Wave 2

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M0-002](../issues/m0/M0-002-create-the-repository-skeleton-and-ownership-boundaries.md) | architecture | `repo-scaffold` | M0-001 | candidate; check file overlap |

### Wave 3

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M0-003](../issues/m0/M0-003-pin-bun-typescript-and-the-deterministic-toolchain.md) | packaging | `shared-package` | M0-002 | candidate; check file overlap |

### Wave 4

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M0-004](../issues/m0/M0-004-establish-ci-skeleton-and-one-verification-command.md) | ci | `shared-ci` | M0-002, M0-003 | candidate; check file overlap |
| [M0-005](../issues/m0/M0-005-implement-the-okf-link-and-issue-dependency-validator.md) | docs | `docs-validator` | M0-002, M0-003 | candidate; check file overlap |
| [M0-006](../issues/m0/M0-006-characterize-bun-native-route-and-server-semantics.md) | routing | `raw-bun-fixtures` | M0-003 | candidate; check file overlap |
| [M0-007](../issues/m0/M0-007-create-raw-bun-benchmark-fixtures-and-readiness-protocol.md) | performance | `benchmark-harness` | M0-003 | candidate; check file overlap |
| [M0-008](../issues/m0/M0-008-create-an-idiomatic-elysia-2-comparison-fixture.md) | performance | `shared-package` | M0-003 | candidate; check file overlap |
| [M0-009](../issues/m0/M0-009-prove-the-route-services-guards-and-client-type-encoding.md) | types | `types-spike` | M0-003 | candidate; check file overlap |

### Wave 5

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M0-010](../issues/m0/M0-010-define-malformed-request-and-security-fixture-plan.md) | security | `security-fixtures` | M0-001, M0-006 | candidate; check file overlap |
| [M0-011](../issues/m0/M0-011-install-contribution-and-subagent-worktree-guards.md) | ci | `contributor-policy` | M0-002, M0-004 | candidate; check file overlap |

### Wave 6

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M0-GATE](../issues/m0/M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md) | release | `gate` | M0-001, M0-002, M0-003, M0-004, M0-005, M0-006, M0-007, M0-008, M0-009, M0-010, M0-011 | gate/barrier |

## M1 — Bun-Native Kernel

### Wave 1

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M1-001](../issues/m1/M1-001-create-the-core-public-and-internal-type-skeleton.md) | core | `core-types` | M0-GATE, M0-009 | candidate; check file overlap |

### Wave 2

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M1-002](../issues/m1/M1-002-implement-typed-response-branding-and-json.md) | responses | `responses` | M1-001 | candidate; check file overlap |
| [M1-004](../issues/m1/M1-004-implement-the-route-descriptor-factory-and-local-invariants.md) | core | `core-route` | M1-001 | candidate; check file overlap |
| [M1-005](../issues/m1/M1-005-implement-named-guard-descriptors-and-metadata.md) | guards | `guards` | M1-001 | candidate; check file overlap |

### Wave 3

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M1-003](../issues/m1/M1-003-implement-text-empty-problem-and-redirect.md) | responses | `responses` | M1-002 | candidate; check file overlap |
| [M1-006](../issues/m1/M1-006-implement-named-module-route-containers.md) | core | `core-module` | M1-004 | candidate; check file overlap |

### Wave 4

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M1-007](../issues/m1/M1-007-implement-the-defineapp-validation-and-composition-shell.md) | core | `core-app` | M1-004, M1-005, M1-006 | candidate; check file overlap |

### Wave 5

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M1-008](../issues/m1/M1-008-classify-and-preserve-native-bun-route-entries.md) | routing | `routing` | M1-007, M0-006 | candidate; check file overlap |
| [M1-009](../issues/m1/M1-009-compile-lugas-descriptors-into-bun-handlers.md) | routing | `routing-compiler` | M1-007 | candidate; check file overlap |
| [M1-012](../issues/m1/M1-012-reject-duplicate-routes-and-module-ownership-conflicts.md) | routing | `core-app` | M1-006, M1-007 | candidate; check file overlap |
| [M1-013](../issues/m1/M1-013-validate-route-path-and-params-declaration-consistency.md) | routing | `routing-path` | M1-004, M1-007 | candidate; check file overlap |
| [M1-014](../issues/m1/M1-014-implement-default-not-found-and-unexpected-error-policies.md) | responses | `error-policy` | M1-003, M1-007 | candidate; check file overlap |

### Wave 6

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M1-010](../issues/m1/M1-010-preserve-the-synchronous-route-fast-path.md) | performance | `routing-compiler` | M1-009 | candidate; check file overlap |
| [M1-011](../issues/m1/M1-011-implement-services-and-base-request-context-typing.md) | core | `core-types` | M1-001, M1-009 | candidate; check file overlap |
| [M1-015](../issues/m1/M1-015-implement-app-serve-and-safe-bun-option-passthrough.md) | core | `core-app` | M1-008, M1-009, M1-014 | candidate; check file overlap |

### Wave 7

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M1-016](../issues/m1/M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md) | testing | `m1-test-closure` | M1-002, M1-003, M1-004, M1-005, M1-006, M1-008, M1-009, M1-011, M1-012, M1-013, M1-014, M1-015 | candidate; check file overlap |
| [M1-017](../issues/m1/M1-017-build-the-minimal-basic-proof-application.md) | docs | `examples` | M1-003, M1-011, M1-015 | candidate; check file overlap |
| [M1-018](../issues/m1/M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md) | packaging | `shared-package` | M1-001, M1-002, M1-003, M1-004, M1-005, M1-006, M1-007, M1-015 | candidate; check file overlap |

### Wave 8

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M1-GATE](../issues/m1/M1-GATE-verify-the-bun-native-kernel-and-response-contract.md) | release | `gate` | M1-001, M1-002, M1-003, M1-004, M1-005, M1-006, M1-007, M1-008, M1-009, M1-010, M1-011, M1-012, M1-013, M1-014, M1-015, M1-016, M1-017, M1-018 | gate/barrier |

## M2 — Validation and Guards

### Wave 1

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M2-001](../issues/m2/M2-001-implement-the-standard-schema-executor-and-dependency-decision.md) | validation | `shared-package` | M1-GATE | candidate; check file overlap |
| [M2-004](../issues/m2/M2-004-define-and-implement-deterministic-query-decoding.md) | validation | `validation` | M1-GATE, M0-006 | candidate; check file overlap |
| [M2-007](../issues/m2/M2-007-implement-json-media-type-and-malformed-body-parsing-policy.md) | validation | `validation-body` | M1-GATE, M0-010 | candidate; check file overlap |
| [M2-010](../issues/m2/M2-010-execute-guards-with-sync-path-and-response-short-circuit.md) | guards | `routing-compiler` | M1-GATE, M1-005, M1-009 | candidate; check file overlap |

### Wave 2

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M2-002](../issues/m2/M2-002-normalize-validation-issues-safely.md) | validation | `validation` | M2-001, M1-003 | candidate; check file overlap |
| [M2-003](../issues/m2/M2-003-add-params-validation-and-transformed-output.md) | validation | `validation` | M2-001, M1-013 | candidate; check file overlap |
| [M2-005](../issues/m2/M2-005-add-query-validation-and-inferred-output.md) | validation | `validation` | M2-001, M2-004 | candidate; check file overlap |
| [M2-006](../issues/m2/M2-006-add-lower-case-header-projection-and-validation.md) | validation | `validation` | M2-001 | candidate; check file overlap |
| [M2-008](../issues/m2/M2-008-add-json-body-validation-and-transformed-output.md) | validation | `validation-body` | M2-001, M2-007 | candidate; check file overlap |
| [M2-011](../issues/m2/M2-011-propagate-typed-guard-context-enrichment.md) | guards | `core-types` | M2-010, M1-011, M0-009 | candidate; check file overlap |
| [M2-012](../issues/m2/M2-012-merge-guard-short-circuit-responses-into-route-contracts.md) | types | `core-types` | M2-010, M1-002, M0-009 | candidate; check file overlap |
| [M2-015](../issues/m2/M2-015-document-and-test-request-body-limits-and-native-passthrough.md) | security | `security-fixtures` | M2-007, M1-015 | candidate; check file overlap |

### Wave 3

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M2-009](../issues/m2/M2-009-unify-request-validation-problem-details-mapping.md) | validation | `validation` | M2-002, M2-003, M2-005, M2-006, M2-008 | candidate; check file overlap |
| [M2-013](../issues/m2/M2-013-close-multi-guard-ordering-collision-and-failure-semantics.md) | guards | `guard-tests` | M2-010, M2-011, M2-012 | candidate; check file overlap |

### Wave 4

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M2-014](../issues/m2/M2-014-compose-the-validation-and-guard-request-pipeline.md) | routing | `routing-compiler` | M2-003, M2-005, M2-006, M2-008, M2-013 | candidate; check file overlap |

### Wave 5

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M2-016](../issues/m2/M2-016-build-validation-and-guard-proof-applications.md) | docs | `examples` | M2-014 | candidate; check file overlap |
| [M2-017](../issues/m2/M2-017-run-malformed-request-and-adversarial-validation-matrix.md) | security | `security-fixtures` | M2-009, M2-014, M0-010 | candidate; check file overlap |
| [M2-018](../issues/m2/M2-018-close-route-context-and-guard-type-tests.md) | types | `type-tests` | M2-011, M2-012, M2-014 | candidate; check file overlap |

### Wave 6

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M2-GATE](../issues/m2/M2-GATE-verify-validation-guards-security-and-context-contracts.md) | release | `gate` | M2-001, M2-002, M2-003, M2-004, M2-005, M2-006, M2-007, M2-008, M2-009, M2-010, M2-011, M2-012, M2-013, M2-014, M2-015, M2-016, M2-017, M2-018 | gate/barrier |

## M3 — Typed Contract and Client

### Wave 1

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M3-001](../issues/m3/M3-001-extract-the-application-route-contract-type.md) | types | `core-types` | M2-GATE, M1-GATE, M0-009 | candidate; check file overlap |

### Wave 2

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M3-002](../issues/m3/M3-002-derive-method-specific-path-and-input-lookup-types.md) | types | `client-types` | M3-001, M2-GATE | candidate; check file overlap |
| [M3-003](../issues/m3/M3-003-extract-status-and-body-response-unions.md) | types | `client-types` | M3-001, M1-003 | candidate; check file overlap |
| [M3-005](../issues/m3/M3-005-generate-25-100-500-and-1-000-route-type-fixtures.md) | types | `type-fixtures` | M3-001 | candidate; check file overlap |

### Wave 3

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M3-004](../issues/m3/M3-004-merge-guard-responses-into-client-outcome-types.md) | types | `client-types` | M3-003, M2-012 | candidate; check file overlap |
| [M3-006](../issues/m3/M3-006-implement-createclient-base-configuration-and-fetch-injection.md) | client | `client-runtime` | M3-002 | candidate; check file overlap |

### Wave 4

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M3-007](../issues/m3/M3-007-add-typed-explicit-http-methods-and-path-restrictions.md) | client | `client-runtime` | M3-002, M3-006 | candidate; check file overlap |

### Wave 5

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M3-008](../issues/m3/M3-008-implement-path-parameter-interpolation-and-encoding.md) | client | `client-runtime` | M3-007 | candidate; check file overlap |
| [M3-009](../issues/m3/M3-009-implement-query-serialization-matching-server-decoding.md) | client | `client-runtime` | M3-007, M2-004 | candidate; check file overlap |
| [M3-010](../issues/m3/M3-010-implement-headers-json-body-and-requestinit-merging.md) | client | `client-runtime` | M3-007, M2-007 | candidate; check file overlap |
| [M3-011](../issues/m3/M3-011-parse-http-responses-into-discriminated-client-results.md) | client | `client-runtime` | M3-003, M3-007 | candidate; check file overlap |
| [M3-017](../issues/m3/M3-017-establish-the-typescript-performance-gate-and-fallback-policy.md) | types | `type-fixtures` | M3-004, M3-005, M3-007 | candidate; check file overlap |

### Wave 6

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M3-012](../issues/m3/M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md) | client | `client-runtime` | M3-011, M1-003 | candidate; check file overlap |
| [M3-013](../issues/m3/M3-013-preserve-network-abort-and-raw-fetch-failure-behavior.md) | client | `client-runtime` | M3-011 | candidate; check file overlap |

### Wave 7

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M3-014](../issues/m3/M3-014-prove-the-client-export-is-browser-safe-and-bun-free.md) | packaging | `client-package` | M3-006, M3-007, M3-008, M3-009, M3-010, M3-011, M3-012, M3-013 | candidate; check file overlap |
| [M3-015](../issues/m3/M3-015-close-the-client-unit-and-adversarial-matrix.md) | testing | `client-tests` | M3-008, M3-009, M3-010, M3-011, M3-012, M3-013 | candidate; check file overlap |

### Wave 8

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M3-016](../issues/m3/M3-016-prove-full-server-to-client-contract-behavior.md) | testing | `client-integration` | M2-GATE, M3-015 | candidate; check file overlap |
| [M3-018](../issues/m3/M3-018-finalize-lugas-client-exports-and-packed-consumer-tests.md) | packaging | `shared-package` | M3-014, M3-017 | candidate; check file overlap |

### Wave 9

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M3-GATE](../issues/m3/M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md) | release | `gate` | M3-001, M3-002, M3-003, M3-004, M3-005, M3-006, M3-007, M3-008, M3-009, M3-010, M3-011, M3-012, M3-013, M3-014, M3-015, M3-016, M3-017, M3-018 | gate/barrier |

## M4 — Manifest, Tooling, and Agent DX

### Wave 1

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M4-001](../issues/m4/M4-001-freeze-the-runtime-manifest-v1-schema-and-stability-policy.md) | manifest | `manifest-spec` | M3-GATE, M1-GATE | candidate; check file overlap |
| [M4-005](../issues/m4/M4-005-create-the-stable-diagnostic-catalog-and-formatter.md) | manifest | `diagnostics` | M3-GATE, M1-012, M2-009 | candidate; check file overlap |
| [M4-006](../issues/m4/M4-006-implement-the-bun-native-test-server-lifecycle-helper.md) | testing | `testing-runtime` | M3-GATE, M1-015 | candidate; check file overlap |

### Wave 2

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M4-002](../issues/m4/M4-002-capture-module-path-method-and-route-kind-metadata.md) | manifest | `manifest-runtime` | M4-001, M1-007 | candidate; check file overlap |
| [M4-007](../issues/m4/M4-007-integrate-the-typed-client-with-the-test-server-helper.md) | testing | `testing-runtime` | M4-006, M3-GATE | candidate; check file overlap |
| [M4-008](../issues/m4/M4-008-close-test-server-cleanup-failure-and-leak-behavior.md) | testing | `testing-stress` | M4-006 | candidate; check file overlap |

### Wave 3

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M4-003](../issues/m4/M4-003-capture-validation-capabilities-and-ordered-guard-names-truthfully.md) | manifest | `manifest-runtime` | M4-002, M2-GATE | candidate; check file overlap |
| [M4-013](../issues/m4/M4-013-create-canonical-basic-validation-auth-and-client-examples.md) | docs | `examples` | M2-GATE, M3-GATE, M4-007 | candidate; check file overlap |

### Wave 4

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M4-004](../issues/m4/M4-004-expose-readonly-app-manifest-and-deterministic-json.md) | manifest | `core-app` | M4-003 | candidate; check file overlap |
| [M4-014](../issues/m4/M4-014-generate-concise-llms-txt-from-canonical-concepts.md) | docs | `agent-docs` | M4-013 | candidate; check file overlap |
| [M4-016](../issues/m4/M4-016-finalize-repository-agents-and-evidence-enforcement.md) | docs | `contributor-policy` | M4-005, M4-013 | candidate; check file overlap |

### Wave 5

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M4-009](../issues/m4/M4-009-lock-diagnostic-and-manifest-golden-contracts.md) | testing | `goldens` | M4-004, M4-005 | candidate; check file overlap |
| [M4-010](../issues/m4/M4-010-spike-safe-application-import-for-cli-inspection.md) | cli | `cli-spike` | M4-004 | candidate; check file overlap |
| [M4-015](../issues/m4/M4-015-generate-full-agent-reference-and-lugas-skill-document.md) | docs | `agent-docs` | M4-014 | candidate; check file overlap |

### Wave 6

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M4-011](../issues/m4/M4-011-implement-lugas-routes-and-lugas-inspect-json.md) | cli | `cli-runtime` | M4-010 | candidate; check file overlap |

### Wave 7

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M4-012](../issues/m4/M4-012-test-cli-no-server-start-timeout-and-process-exit-guarantees.md) | cli | `cli-tests` | M4-011 | candidate; check file overlap |
| [M4-017](../issues/m4/M4-017-finalize-lugas-testing-and-cli-package-exports.md) | packaging | `shared-package` | M4-007, M4-008, M4-011 | candidate; check file overlap |

### Wave 8

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M4-GATE](../issues/m4/M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md) | release | `gate` | M4-001, M4-002, M4-003, M4-004, M4-005, M4-006, M4-007, M4-008, M4-009, M4-010, M4-011, M4-012, M4-013, M4-014, M4-015, M4-016, M4-017 | gate/barrier |

## M5 — Hardening and Private Alpha

### Wave 1

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M5-001](../issues/m5/M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md) | performance | `benchmark-harness` | M4-GATE, M0-007, M0-008, M1-GATE | candidate; check file overlap |
| [M5-008](../issues/m5/M5-008-perform-the-full-malformed-input-and-redaction-security-review.md) | security | `security-review` | M4-GATE, M2-017, M4-005 | candidate; check file overlap |
| [M5-009](../issues/m5/M5-009-audit-dependencies-licenses-package-contents-and-sbom.md) | security | `package-audit` | M4-GATE, M1-018, M3-018, M4-017 | candidate; check file overlap |
| [M5-010](../issues/m5/M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-windows.md) | ci | `shared-ci` | M0-004, M4-GATE | candidate; check file overlap |
| [M5-011](../issues/m5/M5-011-close-static-file-directory-and-native-passthrough-security-tests.md) | security | `security-review` | M4-GATE, M1-008, M0-006 | candidate; check file overlap |
| [M5-012](../issues/m5/M5-012-stress-synchronous-and-asynchronous-guards-and-validators.md) | testing | `stress-tests` | M4-GATE, M2-GATE | candidate; check file overlap |
| [M5-013](../issues/m5/M5-013-stress-cancellation-abort-slow-bodies-and-client-transport.md) | security | `stress-tests` | M4-GATE, M2-GATE, M3-013 | candidate; check file overlap |
| [M5-015](../issues/m5/M5-015-review-api-consistency-against-principles-and-elysia-lessons.md) | architecture | `architecture-review` | M4-GATE | candidate; check file overlap |
| [M5-016](../issues/m5/M5-016-build-the-production-shaped-crud-proof-api.md) | testing | `proof-api` | M4-GATE, M4-013 | candidate; check file overlap |

### Wave 2

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M5-002](../issues/m5/M5-002-measure-raw-bun-versus-lugas-plain-route-overhead.md) | performance | `benchmark-results` | M5-001, M2-GATE | candidate; check file overlap |
| [M5-003](../issues/m5/M5-003-measure-feature-equivalent-validation-and-guard-pipelines.md) | performance | `benchmark-results` | M5-001, M2-GATE | candidate; check file overlap |
| [M5-004](../issues/m5/M5-004-measure-1-000-and-10-000-route-startup-and-memory.md) | performance | `benchmark-results` | M5-001, M1-GATE | candidate; check file overlap |
| [M5-005](../issues/m5/M5-005-measure-client-bundle-and-typescript-contract-cost.md) | performance | `benchmark-results` | M5-001, M3-GATE | candidate; check file overlap |
| [M5-006](../issues/m5/M5-006-integrate-bun-cpu-heap-and-metafile-diagnostics.md) | performance | `benchmark-harness` | M5-001, M4-GATE | candidate; check file overlap |

### Wave 3

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M5-007](../issues/m5/M5-007-install-performance-size-and-type-regression-gates.md) | performance | `shared-ci` | M5-002, M5-003, M5-004, M5-005, M5-006 | candidate; check file overlap |
| [M5-014](../issues/m5/M5-014-run-10-000-route-runtime-and-type-stress-closure.md) | performance | `benchmark-results` | M3-017, M5-004 | candidate; check file overlap |

### Wave 4

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M5-017](../issues/m5/M5-017-assemble-the-private-alpha-review-and-release-packet.md) | release | `release-packet` | M5-002, M5-003, M5-004, M5-005, M5-007, M5-008, M5-009, M5-010, M5-011, M5-012, M5-013, M5-014, M5-015, M5-016 | candidate; check file overlap |

### Wave 5

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M5-GATE](../issues/m5/M5-GATE-verify-private-alpha-hardening-and-evidence.md) | release | `gate` | M5-001, M5-002, M5-003, M5-004, M5-005, M5-006, M5-007, M5-008, M5-009, M5-010, M5-011, M5-012, M5-013, M5-014, M5-015, M5-016, M5-017 | gate/barrier |

## M6 — Beta Stabilization and Release

### Wave 1

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M6-001](../issues/m6/M6-001-freeze-the-beta-public-api-candidate-and-deprecation-policy.md) | architecture | `architecture-review` | M5-GATE | candidate; check file overlap |
| [M6-002](../issues/m6/M6-002-complete-raw-bun-and-elysia-migration-adoption-documentation.md) | docs | `beta-docs` | M5-GATE, M5-015, M5-016 | candidate; check file overlap |
| [M6-003](../issues/m6/M6-003-run-package-publication-dry-run-and-provenance-rehearsal.md) | packaging | `release-packet` | M5-GATE, M5-009, M5-017 | candidate; check file overlap |
| [M6-004](../issues/m6/M6-004-resolve-package-repository-organization-and-domain-ownership.md) | release | `owner-decision` | M5-GATE | owner action |
| [M6-005](../issues/m6/M6-005-resolve-final-license-and-initial-governance.md) | release | `owner-decision` | M5-GATE | owner action |
| [M6-006](../issues/m6/M6-006-finalize-the-supported-bun-1-4-compatibility-matrix.md) | ci | `shared-ci` | M5-GATE, M5-010 | candidate; check file overlap |
| [M6-007](../issues/m6/M6-007-triage-all-defects-and-enforce-zero-p0-p1-beta-gate.md) | release | `release-governance` | M5-GATE | candidate; check file overlap |
| [M6-008](../issues/m6/M6-008-run-an-independent-clean-room-agent-implementation-and-review.md) | docs | `clean-room` | M5-GATE, M4-015, M5-016 | candidate; check file overlap |

### Wave 2

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M6-009](../issues/m6/M6-009-rerun-final-security-performance-type-and-package-evidence.md) | release | `release-packet` | M6-001, M6-006, M6-007 | candidate; check file overlap |

### Wave 3

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M6-010](../issues/m6/M6-010-assemble-the-v0-1-0-beta-1-release-packet.md) | release | `release-packet` | M6-002, M6-003, M6-004, M6-005, M6-008, M6-009 | candidate; check file overlap |

### Wave 4

| ID | Area | Conflict group | Depends on | Parallel note |
|---|---|---|---|---|
| [M6-GATE](../issues/m6/M6-GATE-approve-or-reject-the-v0-1-0-beta-1-release-candidate.md) | release | `gate` | M6-001, M6-002, M6-003, M6-004, M6-005, M6-006, M6-007, M6-008, M6-009, M6-010 | owner action |
