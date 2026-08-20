# M1 — Bun-Native Kernel

Tasks and gates: **19**.

- [M1-001 — Create the core public and internal type skeleton](M1-001-create-the-core-public-and-internal-type-skeleton.md) — wave 1, depends on M0-GATE, M0-009
- [M1-002 — Implement typed response branding and `json`](M1-002-implement-typed-response-branding-and-json.md) — wave 2, depends on M1-001
- [M1-003 — Implement `text`, `empty`, `problem`, and `redirect`](M1-003-implement-text-empty-problem-and-redirect.md) — wave 3, depends on M1-002
- [M1-004 — Implement the route descriptor factory and local invariants](M1-004-implement-the-route-descriptor-factory-and-local-invariants.md) — wave 2, depends on M1-001
- [M1-005 — Implement named guard descriptors and metadata](M1-005-implement-named-guard-descriptors-and-metadata.md) — wave 2, depends on M1-001
- [M1-006 — Implement named module route containers](M1-006-implement-named-module-route-containers.md) — wave 3, depends on M1-004
- [M1-007 — Implement the `defineApp` validation and composition shell](M1-007-implement-the-defineapp-validation-and-composition-shell.md) — wave 4, depends on M1-004, M1-005, M1-006
- [M1-008 — Classify and preserve native Bun route entries](M1-008-classify-and-preserve-native-bun-route-entries.md) — wave 5, depends on M1-007, M0-006
- [M1-009 — Compile Lugas descriptors into Bun handlers](M1-009-compile-lugas-descriptors-into-bun-handlers.md) — wave 5, depends on M1-007
- [M1-010 — Preserve the synchronous route fast path](M1-010-preserve-the-synchronous-route-fast-path.md) — wave 6, depends on M1-009
- [M1-011 — Implement services and base request context typing](M1-011-implement-services-and-base-request-context-typing.md) — wave 6, depends on M1-001, M1-009
- [M1-012 — Reject duplicate routes and module ownership conflicts](M1-012-reject-duplicate-routes-and-module-ownership-conflicts.md) — wave 5, depends on M1-006, M1-007
- [M1-013 — Validate route path and params declaration consistency](M1-013-validate-route-path-and-params-declaration-consistency.md) — wave 5, depends on M1-004, M1-007
- [M1-014 — Implement default not-found and unexpected-error policies](M1-014-implement-default-not-found-and-unexpected-error-policies.md) — wave 5, depends on M1-003, M1-007
- [M1-015 — Implement `app.serve` and safe Bun option passthrough](M1-015-implement-app-serve-and-safe-bun-option-passthrough.md) — wave 6, depends on M1-008, M1-009, M1-014
- [M1-016 — Close the M1 kernel conformance and negative-test matrix](M1-016-close-the-m1-kernel-conformance-and-negative-test-matrix.md) — wave 7, depends on M1-002, M1-003, M1-004, M1-005, M1-006, M1-008, M1-009, M1-011, M1-012, M1-013, M1-014, M1-015
- [M1-017 — Build the minimal basic proof application](M1-017-build-the-minimal-basic-proof-application.md) — wave 7, depends on M1-003, M1-011, M1-015
- [M1-018 — Finalize M1 package exports and declaration smoke tests](M1-018-finalize-m1-package-exports-and-declaration-smoke-tests.md) — wave 7, depends on M1-001, M1-002, M1-003, M1-004, M1-005, M1-006, M1-007, M1-015
- [M1-GATE — Verify the Bun-native kernel and response contract](M1-GATE-verify-the-bun-native-kernel-and-response-contract.md) — wave 8, depends on M1-001, M1-002, M1-003, M1-004, M1-005, M1-006, M1-007, M1-008, M1-009, M1-010, M1-011, M1-012, M1-013, M1-014, M1-015, M1-016, M1-017, M1-018
