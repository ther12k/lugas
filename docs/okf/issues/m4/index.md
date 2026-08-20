# M4 — Manifest, Tooling, and Agent DX

Tasks and gates: **18**.

- [M4-001 — Freeze the runtime manifest v1 schema and stability policy](M4-001-freeze-the-runtime-manifest-v1-schema-and-stability-policy.md) — wave 1, depends on M3-GATE, M1-GATE
- [M4-002 — Capture module, path, method, and route-kind metadata](M4-002-capture-module-path-method-and-route-kind-metadata.md) — wave 2, depends on M4-001, M1-007
- [M4-003 — Capture validation capabilities and ordered guard names truthfully](M4-003-capture-validation-capabilities-and-ordered-guard-names-truthfully.md) — wave 3, depends on M4-002, M2-GATE
- [M4-004 — Expose readonly `app.manifest` and deterministic JSON](M4-004-expose-readonly-app-manifest-and-deterministic-json.md) — wave 4, depends on M4-003
- [M4-005 — Create the stable diagnostic catalog and formatter](M4-005-create-the-stable-diagnostic-catalog-and-formatter.md) — wave 1, depends on M3-GATE, M1-012, M2-009
- [M4-006 — Implement the Bun-native test server lifecycle helper](M4-006-implement-the-bun-native-test-server-lifecycle-helper.md) — wave 1, depends on M3-GATE, M1-015
- [M4-007 — Integrate the typed client with the test server helper](M4-007-integrate-the-typed-client-with-the-test-server-helper.md) — wave 2, depends on M4-006, M3-GATE
- [M4-008 — Close test-server cleanup, failure, and leak behavior](M4-008-close-test-server-cleanup-failure-and-leak-behavior.md) — wave 2, depends on M4-006
- [M4-009 — Lock diagnostic and manifest golden contracts](M4-009-lock-diagnostic-and-manifest-golden-contracts.md) — wave 5, depends on M4-004, M4-005
- [M4-010 — Spike safe application import for CLI inspection](M4-010-spike-safe-application-import-for-cli-inspection.md) — wave 5, depends on M4-004
- [M4-011 — Implement `lugas routes` and `lugas inspect --json`](M4-011-implement-lugas-routes-and-lugas-inspect-json.md) — wave 6, depends on M4-010
- [M4-012 — Test CLI no-server-start, timeout, and process-exit guarantees](M4-012-test-cli-no-server-start-timeout-and-process-exit-guarantees.md) — wave 7, depends on M4-011
- [M4-013 — Create canonical basic, validation, auth, and client examples](M4-013-create-canonical-basic-validation-auth-and-client-examples.md) — wave 3, depends on M2-GATE, M3-GATE, M4-007
- [M4-014 — Generate concise `llms.txt` from canonical concepts](M4-014-generate-concise-llms-txt-from-canonical-concepts.md) — wave 4, depends on M4-013
- [M4-015 — Generate full agent reference and Lugas skill document](M4-015-generate-full-agent-reference-and-lugas-skill-document.md) — wave 5, depends on M4-014
- [M4-016 — Finalize repository AGENTS and evidence enforcement](M4-016-finalize-repository-agents-and-evidence-enforcement.md) — wave 4, depends on M4-005, M4-013
- [M4-017 — Finalize `lugas/testing` and CLI package exports](M4-017-finalize-lugas-testing-and-cli-package-exports.md) — wave 7, depends on M4-007, M4-008, M4-011
- [M4-GATE — Verify manifest truth, testing, CLI, examples, and agent documentation](M4-GATE-verify-manifest-truth-testing-cli-examples-and-agent-documentation.md) — wave 8, depends on M4-001, M4-002, M4-003, M4-004, M4-005, M4-006, M4-007, M4-008, M4-009, M4-010, M4-011, M4-012, M4-013, M4-014, M4-015, M4-016, M4-017
