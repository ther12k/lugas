---
type: Operations Guide
title: Generated GitHub Issue Creation Commands
status: draft
tags:
- github
- commands
- issues
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# GitHub Issue Creation Commands

Review repository authentication, milestones, and labels before executing. These commands create issues but do not add GitHub dependency relationships automatically.

```bash
set -euo pipefail

gh issue create \
  --title "M0-001 — Freeze the design baseline and decision registry" \
  --body-file "docs/okf/issues/m0/M0-001-freeze-the-design-baseline-and-decision-registry.md" \
  --label "type:docs,area:architecture,priority:p0,size:s,agent-ready" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-002 — Create the repository skeleton and ownership boundaries" \
  --body-file "docs/okf/issues/m0/M0-002-create-the-repository-skeleton-and-ownership-boundaries.md" \
  --label "type:implementation,area:architecture,priority:p0,size:m" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-003 — Pin Bun, TypeScript, and the deterministic toolchain" \
  --body-file "docs/okf/issues/m0/M0-003-pin-bun-typescript-and-the-deterministic-toolchain.md" \
  --label "type:integration,area:packaging,priority:p0,size:m" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-004 — Establish CI skeleton and one verification command" \
  --body-file "docs/okf/issues/m0/M0-004-establish-ci-skeleton-and-one-verification-command.md" \
  --label "type:integration,area:ci,priority:p0,size:m" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-005 — Implement the OKF, link, and issue dependency validator" \
  --body-file "docs/okf/issues/m0/M0-005-implement-the-okf-link-and-issue-dependency-validator.md" \
  --label "type:implementation,area:docs,priority:p0,size:m" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-006 — Characterize Bun native route and server semantics" \
  --body-file "docs/okf/issues/m0/M0-006-characterize-bun-native-route-and-server-semantics.md" \
  --label "type:spike,area:routing,priority:p0,size:l" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-007 — Create raw Bun benchmark fixtures and readiness protocol" \
  --body-file "docs/okf/issues/m0/M0-007-create-raw-bun-benchmark-fixtures-and-readiness-protocol.md" \
  --label "type:benchmark,area:performance,priority:p0,size:m" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-008 — Create an idiomatic Elysia 2 comparison fixture" \
  --body-file "docs/okf/issues/m0/M0-008-create-an-idiomatic-elysia-2-comparison-fixture.md" \
  --label "type:benchmark,area:performance,priority:p1,size:m" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-009 — Prove the route, services, guards, and client type encoding" \
  --body-file "docs/okf/issues/m0/M0-009-prove-the-route-services-guards-and-client-type-encoding.md" \
  --label "type:spike,area:types,priority:p0,size:l" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-010 — Define malformed-request and security fixture plan" \
  --body-file "docs/okf/issues/m0/M0-010-define-malformed-request-and-security-fixture-plan.md" \
  --label "type:docs,area:security,priority:p0,size:m" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-011 — Install contribution and subagent worktree guards" \
  --body-file "docs/okf/issues/m0/M0-011-install-contribution-and-subagent-worktree-guards.md" \
  --label "type:docs,area:ci,priority:p0,size:m" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M0-GATE — Verify M0 design, tooling, Bun oracle, and agent readiness" \
  --body-file "docs/okf/issues/m0/M0-GATE-verify-m0-design-tooling-bun-oracle-and-agent-readiness.md" \
  --label "type:gate,area:release,priority:p0,size:l" \
  --milestone "M0 — Design Freeze and Baselines"

gh issue create \
  --title "M1-001 — Create the core public and internal type skeleton" \
  --body-file "docs/okf/issues/m1/M1-001-create-the-core-public-and-internal-type-skeleton.md" \
  --label "type:implementation,area:core,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-002 — Implement typed response branding and `json`" \
  --body-file "docs/okf/issues/m1/M1-002-implement-typed-response-branding-and-json.md" \
  --label "type:implementation,area:responses,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-003 — Implement `text`, `empty`, `problem`, and `redirect`" \
  --body-file "docs/okf/issues/m1/M1-003-implement-text-empty-problem-and-redirect.md" \
  --label "type:implementation,area:responses,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-004 — Implement the route descriptor factory and local invariants" \
  --body-file "docs/okf/issues/m1/M1-004-implement-the-route-descriptor-factory-and-local-invariants.md" \
  --label "type:implementation,area:core,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-005 — Implement named guard descriptors and metadata" \
  --body-file "docs/okf/issues/m1/M1-005-implement-named-guard-descriptors-and-metadata.md" \
  --label "type:implementation,area:guards,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-006 — Implement named module route containers" \
  --body-file "docs/okf/issues/m1/M1-006-implement-named-module-route-containers.md" \
  --label "type:implementation,area:core,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-007 — Implement the `defineApp` validation and composition shell" \
  --body-file "docs/okf/issues/m1/M1-007-implement-the-defineapp-validation-and-composition-shell.md" \
  --label "type:implementation,area:core,priority:p0,size:l" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-008 — Classify and preserve native Bun route entries" \
  --body-file "docs/okf/issues/m1/M1-008-classify-and-preserve-native-bun-route-entries.md" \
  --label "type:implementation,area:routing,priority:p0,size:l" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-009 — Compile Lugas descriptors into Bun handlers" \
  --body-file "docs/okf/issues/m1/M1-009-compile-lugas-descriptors-into-bun-handlers.md" \
  --label "type:implementation,area:routing,priority:p0,size:l" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-010 — Preserve the synchronous route fast path" \
  --body-file "docs/okf/issues/m1/M1-010-preserve-the-synchronous-route-fast-path.md" \
  --label "type:implementation,area:performance,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-011 — Implement services and base request context typing" \
  --body-file "docs/okf/issues/m1/M1-011-implement-services-and-base-request-context-typing.md" \
  --label "type:implementation,area:core,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-012 — Reject duplicate routes and module ownership conflicts" \
  --body-file "docs/okf/issues/m1/M1-012-reject-duplicate-routes-and-module-ownership-conflicts.md" \
  --label "type:implementation,area:routing,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-013 — Validate route path and params declaration consistency" \
  --body-file "docs/okf/issues/m1/M1-013-validate-route-path-and-params-declaration-consistency.md" \
  --label "type:implementation,area:routing,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-014 — Implement default not-found and unexpected-error policies" \
  --body-file "docs/okf/issues/m1/M1-014-implement-default-not-found-and-unexpected-error-policies.md" \
  --label "type:implementation,area:responses,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-015 — Implement `app.serve` and safe Bun option passthrough" \
  --body-file "docs/okf/issues/m1/M1-015-implement-app-serve-and-safe-bun-option-passthrough.md" \
  --label "type:implementation,area:core,priority:p0,size:l" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-016 — Close the M1 kernel conformance and negative-test matrix" \
  --body-file "docs/okf/issues/m1/M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md" \
  --label "type:test,area:testing,priority:p0,size:l" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-017 — Build the minimal basic proof application" \
  --body-file "docs/okf/issues/m1/M1-017-build-the-minimal-basic-proof-application.md" \
  --label "type:implementation,area:docs,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-018 — Finalize M1 package exports and declaration smoke tests" \
  --body-file "docs/okf/issues/m1/M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md" \
  --label "type:integration,area:packaging,priority:p0,size:m" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M1-GATE — Verify the Bun-native kernel and response contract" \
  --body-file "docs/okf/issues/m1/M1-GATE-verify-the-bun-native-kernel-and-response-contract.md" \
  --label "type:gate,area:release,priority:p0,size:l" \
  --milestone "M1 — Bun-Native Kernel"

gh issue create \
  --title "M2-001 — Implement the Standard Schema executor and dependency decision" \
  --body-file "docs/okf/issues/m2/M2-001-implement-the-standard-schema-executor-and-dependency-decision.md" \
  --label "type:implementation,area:validation,priority:p0,size:l" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-002 — Normalize validation issues safely" \
  --body-file "docs/okf/issues/m2/M2-002-normalize-validation-issues-safely.md" \
  --label "type:implementation,area:validation,priority:p0,size:m" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-003 — Add params validation and transformed output" \
  --body-file "docs/okf/issues/m2/M2-003-add-params-validation-and-transformed-output.md" \
  --label "type:implementation,area:validation,priority:p0,size:m" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-004 — Define and implement deterministic query decoding" \
  --body-file "docs/okf/issues/m2/M2-004-define-and-implement-deterministic-query-decoding.md" \
  --label "type:implementation,area:validation,priority:p0,size:m" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-005 — Add query validation and inferred output" \
  --body-file "docs/okf/issues/m2/M2-005-add-query-validation-and-inferred-output.md" \
  --label "type:implementation,area:validation,priority:p0,size:m" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-006 — Add lower-case header projection and validation" \
  --body-file "docs/okf/issues/m2/M2-006-add-lower-case-header-projection-and-validation.md" \
  --label "type:implementation,area:validation,priority:p0,size:m" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-007 — Implement JSON media-type and malformed-body parsing policy" \
  --body-file "docs/okf/issues/m2/M2-007-implement-json-media-type-and-malformed-body-parsing-policy.md" \
  --label "type:implementation,area:validation,priority:p0,size:l" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-008 — Add JSON body validation and transformed output" \
  --body-file "docs/okf/issues/m2/M2-008-add-json-body-validation-and-transformed-output.md" \
  --label "type:implementation,area:validation,priority:p0,size:m" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-009 — Unify request validation Problem Details mapping" \
  --body-file "docs/okf/issues/m2/M2-009-unify-request-validation-problem-details-mapping.md" \
  --label "type:implementation,area:validation,priority:p0,size:m" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-010 — Execute guards with sync path and response short-circuit" \
  --body-file "docs/okf/issues/m2/M2-010-execute-guards-with-sync-path-and-response-short-circuit.md" \
  --label "type:implementation,area:guards,priority:p0,size:l" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-011 — Propagate typed guard context enrichment" \
  --body-file "docs/okf/issues/m2/M2-011-propagate-typed-guard-context-enrichment.md" \
  --label "type:implementation,area:guards,priority:p0,size:l" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-012 — Merge guard short-circuit responses into route contracts" \
  --body-file "docs/okf/issues/m2/M2-012-merge-guard-short-circuit-responses-into-route-contracts.md" \
  --label "type:implementation,area:types,priority:p0,size:l" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-013 — Close multi-guard ordering, collision, and failure semantics" \
  --body-file "docs/okf/issues/m2/M2-013-close-multi-guard-ordering-collision-and-failure-semantics.md" \
  --label "type:test,area:guards,priority:p0,size:m" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-014 — Compose the validation and guard request pipeline" \
  --body-file "docs/okf/issues/m2/M2-014-compose-the-validation-and-guard-request-pipeline.md" \
  --label "type:implementation,area:routing,priority:p0,size:l" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-015 — Document and test request body limits and native passthrough" \
  --body-file "docs/okf/issues/m2/M2-015-document-and-test-request-body-limits-and-native-passthrough.md" \
  --label "type:test,area:security,priority:p0,size:m" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-016 — Build validation and guard proof applications" \
  --body-file "docs/okf/issues/m2/M2-016-build-validation-and-guard-proof-applications.md" \
  --label "type:implementation,area:docs,priority:p0,size:m" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-017 — Run malformed-request and adversarial validation matrix" \
  --body-file "docs/okf/issues/m2/M2-017-run-malformed-request-and-adversarial-validation-matrix.md" \
  --label "type:security,area:security,priority:p0,size:l" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-018 — Close route-context and guard type tests" \
  --body-file "docs/okf/issues/m2/M2-018-close-route-context-and-guard-type-tests.md" \
  --label "type:test,area:types,priority:p0,size:l" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M2-GATE — Verify validation, guards, security, and context contracts" \
  --body-file "docs/okf/issues/m2/M2-GATE-verify-validation-guards-security-and-context-contracts.md" \
  --label "type:gate,area:release,priority:p0,size:l" \
  --milestone "M2 — Validation and Guards"

gh issue create \
  --title "M3-001 — Extract the application route contract type" \
  --body-file "docs/okf/issues/m3/M3-001-extract-the-application-route-contract-type.md" \
  --label "type:implementation,area:types,priority:p0,size:l" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-002 — Derive method-specific path and input lookup types" \
  --body-file "docs/okf/issues/m3/M3-002-derive-method-specific-path-and-input-lookup-types.md" \
  --label "type:implementation,area:types,priority:p0,size:l" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-003 — Extract status and body response unions" \
  --body-file "docs/okf/issues/m3/M3-003-extract-status-and-body-response-unions.md" \
  --label "type:implementation,area:types,priority:p0,size:l" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-004 — Merge guard responses into client outcome types" \
  --body-file "docs/okf/issues/m3/M3-004-merge-guard-responses-into-client-outcome-types.md" \
  --label "type:implementation,area:types,priority:p0,size:m" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-005 — Generate 25, 100, 500, and 1,000 route type fixtures" \
  --body-file "docs/okf/issues/m3/M3-005-generate-25-100-500-and-1-000-route-type-fixtures.md" \
  --label "type:benchmark,area:types,priority:p0,size:m" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-006 — Implement `createClient` base configuration and fetch injection" \
  --body-file "docs/okf/issues/m3/M3-006-implement-createclient-base-configuration-and-fetch-injection.md" \
  --label "type:implementation,area:client,priority:p0,size:m" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-007 — Add typed explicit HTTP methods and path restrictions" \
  --body-file "docs/okf/issues/m3/M3-007-add-typed-explicit-http-methods-and-path-restrictions.md" \
  --label "type:implementation,area:client,priority:p0,size:m" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-008 — Implement path-parameter interpolation and encoding" \
  --body-file "docs/okf/issues/m3/M3-008-implement-path-parameter-interpolation-and-encoding.md" \
  --label "type:implementation,area:client,priority:p0,size:m" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-009 — Implement query serialization matching server decoding" \
  --body-file "docs/okf/issues/m3/M3-009-implement-query-serialization-matching-server-decoding.md" \
  --label "type:implementation,area:client,priority:p0,size:m" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-010 — Implement headers, JSON body, and RequestInit merging" \
  --body-file "docs/okf/issues/m3/M3-010-implement-headers-json-body-and-requestinit-merging.md" \
  --label "type:implementation,area:client,priority:p0,size:l" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-011 — Parse HTTP responses into discriminated client results" \
  --body-file "docs/okf/issues/m3/M3-011-parse-http-responses-into-discriminated-client-results.md" \
  --label "type:implementation,area:client,priority:p0,size:l" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-012 — Freeze JSON, text, empty, problem, and decode-failure semantics" \
  --body-file "docs/okf/issues/m3/M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md" \
  --label "type:implementation,area:client,priority:p0,size:l" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-013 — Preserve network, abort, and raw fetch failure behavior" \
  --body-file "docs/okf/issues/m3/M3-013-preserve-network-abort-and-raw-fetch-failure-behavior.md" \
  --label "type:implementation,area:client,priority:p0,size:m" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-014 — Prove the client export is browser-safe and Bun-free" \
  --body-file "docs/okf/issues/m3/M3-014-prove-the-client-export-is-browser-safe-and-bun-free.md" \
  --label "type:test,area:packaging,priority:p0,size:m" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-015 — Close the client unit and adversarial matrix" \
  --body-file "docs/okf/issues/m3/M3-015-close-the-client-unit-and-adversarial-matrix.md" \
  --label "type:test,area:testing,priority:p0,size:l" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-016 — Prove full server-to-client contract behavior" \
  --body-file "docs/okf/issues/m3/M3-016-prove-full-server-to-client-contract-behavior.md" \
  --label "type:integration,area:testing,priority:p0,size:l" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-017 — Establish the TypeScript performance gate and fallback policy" \
  --body-file "docs/okf/issues/m3/M3-017-establish-the-typescript-performance-gate-and-fallback-policy.md" \
  --label "type:benchmark,area:types,priority:p0,size:l" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-018 — Finalize `lugas/client` exports and packed consumer tests" \
  --body-file "docs/okf/issues/m3/M3-018-finalize-lugas-client-exports-and-packed-consumer-tests.md" \
  --label "type:integration,area:packaging,priority:p0,size:m" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M3-GATE — Verify end-to-end client types, runtime behavior, and type cost" \
  --body-file "docs/okf/issues/m3/M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md" \
  --label "type:gate,area:release,priority:p0,size:l" \
  --milestone "M3 — Typed Contract and Client"

gh issue create \
  --title "M4-001 — Freeze the runtime manifest v1 schema and stability policy" \
  --body-file "docs/okf/issues/m4/M4-001-freeze-the-runtime-manifest-v1-schema-and-stability-policy.md" \
  --label "type:docs,area:manifest,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-002 — Capture module, path, method, and route-kind metadata" \
  --body-file "docs/okf/issues/m4/M4-002-capture-module-path-method-and-route-kind-metadata.md" \
  --label "type:implementation,area:manifest,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-003 — Capture validation capabilities and ordered guard names truthfully" \
  --body-file "docs/okf/issues/m4/M4-003-capture-validation-capabilities-and-ordered-guard-names-truthfully.md" \
  --label "type:implementation,area:manifest,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-004 — Expose readonly `app.manifest` and deterministic JSON" \
  --body-file "docs/okf/issues/m4/M4-004-expose-readonly-app-manifest-and-deterministic-json.md" \
  --label "type:implementation,area:manifest,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-005 — Create the stable diagnostic catalog and formatter" \
  --body-file "docs/okf/issues/m4/M4-005-create-the-stable-diagnostic-catalog-and-formatter.md" \
  --label "type:implementation,area:manifest,priority:p0,size:l" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-006 — Implement the Bun-native test server lifecycle helper" \
  --body-file "docs/okf/issues/m4/M4-006-implement-the-bun-native-test-server-lifecycle-helper.md" \
  --label "type:implementation,area:testing,priority:p0,size:l" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-007 — Integrate the typed client with the test server helper" \
  --body-file "docs/okf/issues/m4/M4-007-integrate-the-typed-client-with-the-test-server-helper.md" \
  --label "type:implementation,area:testing,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-008 — Close test-server cleanup, failure, and leak behavior" \
  --body-file "docs/okf/issues/m4/M4-008-close-test-server-cleanup-failure-and-leak-behavior.md" \
  --label "type:test,area:testing,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-009 — Lock diagnostic and manifest golden contracts" \
  --body-file "docs/okf/issues/m4/M4-009-lock-diagnostic-and-manifest-golden-contracts.md" \
  --label "type:test,area:testing,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-010 — Spike safe application import for CLI inspection" \
  --body-file "docs/okf/issues/m4/M4-010-spike-safe-application-import-for-cli-inspection.md" \
  --label "type:spike,area:cli,priority:p0,size:l" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-011 — Implement `lugas routes` and `lugas inspect --json`" \
  --body-file "docs/okf/issues/m4/M4-011-implement-lugas-routes-and-lugas-inspect-json.md" \
  --label "type:implementation,area:cli,priority:p0,size:l" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-012 — Test CLI no-server-start, timeout, and process-exit guarantees" \
  --body-file "docs/okf/issues/m4/M4-012-test-cli-no-server-start-timeout-and-process-exit-guarantees.md" \
  --label "type:security,area:cli,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-013 — Create canonical basic, validation, auth, and client examples" \
  --body-file "docs/okf/issues/m4/M4-013-create-canonical-basic-validation-auth-and-client-examples.md" \
  --label "type:docs,area:docs,priority:p0,size:l" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-014 — Generate concise `llms.txt` from canonical concepts" \
  --body-file "docs/okf/issues/m4/M4-014-generate-concise-llms-txt-from-canonical-concepts.md" \
  --label "type:docs,area:docs,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-015 — Generate full agent reference and Lugas skill document" \
  --body-file "docs/okf/issues/m4/M4-015-generate-full-agent-reference-and-lugas-skill-document.md" \
  --label "type:docs,area:docs,priority:p0,size:l" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-016 — Finalize repository AGENTS and evidence enforcement" \
  --body-file "docs/okf/issues/m4/M4-016-finalize-repository-agents-and-evidence-enforcement.md" \
  --label "type:integration,area:docs,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-017 — Finalize `lugas/testing` and CLI package exports" \
  --body-file "docs/okf/issues/m4/M4-017-finalize-lugas-testing-and-cli-package-exports.md" \
  --label "type:integration,area:packaging,priority:p0,size:m" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M4-GATE — Verify manifest truth, testing, CLI, examples, and agent documentation" \
  --body-file "docs/okf/issues/m4/M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md" \
  --label "type:gate,area:release,priority:p0,size:l" \
  --milestone "M4 — Manifest, Tooling, and Agent DX"

gh issue create \
  --title "M5-001 — Freeze benchmark harness methodology and environment manifest" \
  --body-file "docs/okf/issues/m5/M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md" \
  --label "type:benchmark,area:performance,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-002 — Measure raw Bun versus Lugas plain-route overhead" \
  --body-file "docs/okf/issues/m5/M5-002-measure-raw-bun-versus-lugas-plain-route-overhead.md" \
  --label "type:benchmark,area:performance,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-003 — Measure feature-equivalent validation and guard pipelines" \
  --body-file "docs/okf/issues/m5/M5-003-measure-feature-equivalent-validation-and-guard-pipelines.md" \
  --label "type:benchmark,area:performance,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-004 — Measure 1,000 and 10,000 route startup and memory" \
  --body-file "docs/okf/issues/m5/M5-004-measure-1-000-and-10-000-route-startup-and-memory.md" \
  --label "type:benchmark,area:performance,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-005 — Measure client bundle and TypeScript contract cost" \
  --body-file "docs/okf/issues/m5/M5-005-measure-client-bundle-and-typescript-contract-cost.md" \
  --label "type:benchmark,area:performance,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-006 — Integrate Bun CPU, heap, and metafile diagnostics" \
  --body-file "docs/okf/issues/m5/M5-006-integrate-bun-cpu-heap-and-metafile-diagnostics.md" \
  --label "type:benchmark,area:performance,priority:p0,size:m" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-007 — Install performance, size, and type regression gates" \
  --body-file "docs/okf/issues/m5/M5-007-install-performance-size-and-type-regression-gates.md" \
  --label "type:integration,area:performance,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-008 — Perform the full malformed-input and redaction security review" \
  --body-file "docs/okf/issues/m5/M5-008-perform-the-full-malformed-input-and-redaction-security-review.md" \
  --label "type:security,area:security,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-009 — Audit dependencies, licenses, package contents, and SBOM" \
  --body-file "docs/okf/issues/m5/M5-009-audit-dependencies-licenses-package-contents-and-sbom.md" \
  --label "type:security,area:security,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-010 — Run Bun 1.4.x compatibility on Linux, macOS, and Windows" \
  --body-file "docs/okf/issues/m5/M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-windows.md" \
  --label "type:integration,area:ci,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-011 — Close static, file, directory, and native passthrough security tests" \
  --body-file "docs/okf/issues/m5/M5-011-close-static-file-directory-and-native-passthrough-security-tests.md" \
  --label "type:test,area:security,priority:p0,size:m" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-012 — Stress synchronous and asynchronous guards and validators" \
  --body-file "docs/okf/issues/m5/M5-012-stress-synchronous-and-asynchronous-guards-and-validators.md" \
  --label "type:test,area:testing,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-013 — Stress cancellation, abort, slow bodies, and client transport" \
  --body-file "docs/okf/issues/m5/M5-013-stress-cancellation-abort-slow-bodies-and-client-transport.md" \
  --label "type:test,area:security,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-014 — Run 10,000-route runtime and type stress closure" \
  --body-file "docs/okf/issues/m5/M5-014-run-10-000-route-runtime-and-type-stress-closure.md" \
  --label "type:benchmark,area:performance,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-015 — Review API consistency against principles and Elysia lessons" \
  --body-file "docs/okf/issues/m5/M5-015-review-api-consistency-against-principles-and-elysia-lessons.md" \
  --label "type:docs,area:architecture,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-016 — Build the production-shaped CRUD proof API" \
  --body-file "docs/okf/issues/m5/M5-016-build-the-production-shaped-crud-proof-api.md" \
  --label "type:implementation,area:testing,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-017 — Assemble the private alpha review and release packet" \
  --body-file "docs/okf/issues/m5/M5-017-assemble-the-private-alpha-review-and-release-packet.md" \
  --label "type:release,area:release,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M5-GATE — Verify private alpha hardening and evidence" \
  --body-file "docs/okf/issues/m5/M5-GATE-verify-private-alpha-hardening-and-evidence.md" \
  --label "type:gate,area:release,priority:p0,size:l" \
  --milestone "M5 — Hardening and Private Alpha"

gh issue create \
  --title "M6-001 — Freeze the beta public API candidate and deprecation policy" \
  --body-file "docs/okf/issues/m6/M6-001-freeze-the-beta-public-api-candidate-and-deprecation-policy.md" \
  --label "type:docs,area:architecture,priority:p0,size:l" \
  --milestone "M6 — Beta Stabilization and Release"

gh issue create \
  --title "M6-002 — Complete raw Bun and Elysia migration/adoption documentation" \
  --body-file "docs/okf/issues/m6/M6-002-complete-raw-bun-and-elysia-migration-adoption-documentation.md" \
  --label "type:docs,area:docs,priority:p0,size:l" \
  --milestone "M6 — Beta Stabilization and Release"

gh issue create \
  --title "M6-003 — Run package publication dry-run and provenance rehearsal" \
  --body-file "docs/okf/issues/m6/M6-003-run-package-publication-dry-run-and-provenance-rehearsal.md" \
  --label "type:release,area:packaging,priority:p0,size:l" \
  --milestone "M6 — Beta Stabilization and Release"

gh issue create \
  --title "M6-004 — Resolve package, repository, organization, and domain ownership" \
  --body-file "docs/okf/issues/m6/M6-004-resolve-package-repository-organization-and-domain-ownership.md" \
  --label "type:release,area:release,priority:p0,size:m,owner-decision" \
  --milestone "M6 — Beta Stabilization and Release"

gh issue create \
  --title "M6-005 — Resolve final license and initial governance" \
  --body-file "docs/okf/issues/m6/M6-005-resolve-final-license-and-initial-governance.md" \
  --label "type:release,area:release,priority:p0,size:m,owner-decision" \
  --milestone "M6 — Beta Stabilization and Release"

gh issue create \
  --title "M6-006 — Finalize the supported Bun 1.4 compatibility matrix" \
  --body-file "docs/okf/issues/m6/M6-006-finalize-the-supported-bun-1-4-compatibility-matrix.md" \
  --label "type:integration,area:ci,priority:p0,size:m" \
  --milestone "M6 — Beta Stabilization and Release"

gh issue create \
  --title "M6-007 — Triage all defects and enforce zero P0/P1 beta gate" \
  --body-file "docs/okf/issues/m6/M6-007-triage-all-defects-and-enforce-zero-p0-p1-beta-gate.md" \
  --label "type:release,area:release,priority:p0,size:m" \
  --milestone "M6 — Beta Stabilization and Release"

gh issue create \
  --title "M6-008 — Run an independent clean-room agent implementation and review" \
  --body-file "docs/okf/issues/m6/M6-008-run-an-independent-clean-room-agent-implementation-and-review.md" \
  --label "type:test,area:docs,priority:p0,size:l" \
  --milestone "M6 — Beta Stabilization and Release"

gh issue create \
  --title "M6-009 — Rerun final security, performance, type, and package evidence" \
  --body-file "docs/okf/issues/m6/M6-009-rerun-final-security-performance-type-and-package-evidence.md" \
  --label "type:integration,area:release,priority:p0,size:l" \
  --milestone "M6 — Beta Stabilization and Release"

gh issue create \
  --title "M6-010 — Assemble the v0.1.0-beta.1 release packet" \
  --body-file "docs/okf/issues/m6/M6-010-assemble-the-v0-1-0-beta-1-release-packet.md" \
  --label "type:release,area:release,priority:p0,size:l" \
  --milestone "M6 — Beta Stabilization and Release"

gh issue create \
  --title "M6-GATE — Approve or reject the v0.1.0-beta.1 release candidate" \
  --body-file "docs/okf/issues/m6/M6-GATE-approve-or-reject-the-v0-1-0-beta-1-release-candidate.md" \
  --label "type:gate,area:release,priority:p0,size:l,owner-decision" \
  --milestone "M6 — Beta Stabilization and Release"

```

After creation, link dependencies in GitHub Project/issue relationships using the stable IDs from [Issue Index](issue-index.md). Do not replace stable IDs with repository issue numbers.
