# M2 — Validation and Guards

Tasks and gates: **19**.

- [M2-001 — Implement the Standard Schema executor and dependency decision](M2-001-implement-the-standard-schema-executor-and-dependency-decision.md) — wave 1, depends on M1-GATE
- [M2-002 — Normalize validation issues safely](M2-002-normalize-validation-issues-safely.md) — wave 2, depends on M2-001, M1-003
- [M2-003 — Add params validation and transformed output](M2-003-add-params-validation-and-transformed-output.md) — wave 2, depends on M2-001, M1-013
- [M2-004 — Define and implement deterministic query decoding](M2-004-define-and-implement-deterministic-query-decoding.md) — wave 1, depends on M1-GATE, M0-006
- [M2-005 — Add query validation and inferred output](M2-005-add-query-validation-and-inferred-output.md) — wave 2, depends on M2-001, M2-004
- [M2-006 — Add lower-case header projection and validation](M2-006-add-lower-case-header-projection-and-validation.md) — wave 2, depends on M2-001
- [M2-007 — Implement JSON media-type and malformed-body parsing policy](M2-007-implement-json-media-type-and-malformed-body-parsing-policy.md) — wave 1, depends on M1-GATE, M0-010
- [M2-008 — Add JSON body validation and transformed output](M2-008-add-json-body-validation-and-transformed-output.md) — wave 2, depends on M2-001, M2-007
- [M2-009 — Unify request validation Problem Details mapping](M2-009-unify-request-validation-problem-details-mapping.md) — wave 3, depends on M2-002, M2-003, M2-005, M2-006, M2-008
- [M2-010 — Execute guards with sync path and response short-circuit](M2-010-execute-guards-with-sync-path-and-response-short-circuit.md) — wave 1, depends on M1-GATE, M1-005, M1-009
- [M2-011 — Propagate typed guard context enrichment](M2-011-propagate-typed-guard-context-enrichment.md) — wave 2, depends on M2-010, M1-011, M0-009
- [M2-012 — Merge guard short-circuit responses into route contracts](M2-012-merge-guard-short-circuit-responses-into-route-contracts.md) — wave 2, depends on M2-010, M1-002, M0-009
- [M2-013 — Close multi-guard ordering, collision, and failure semantics](M2-013-close-multi-guard-ordering-collision-and-failure-semantics.md) — wave 3, depends on M2-010, M2-011, M2-012
- [M2-014 — Compose the validation and guard request pipeline](M2-014-compose-the-validation-and-guard-request-pipeline.md) — wave 4, depends on M2-003, M2-005, M2-006, M2-008, M2-013
- [M2-015 — Document and test request body limits and native passthrough](M2-015-document-and-test-request-body-limits-and-native-passthrough.md) — wave 2, depends on M2-007, M1-015
- [M2-016 — Build validation and guard proof applications](M2-016-build-validation-and-guard-proof-applications.md) — wave 5, depends on M2-014
- [M2-017 — Run malformed-request and adversarial validation matrix](M2-017-run-malformed-request-and-adversarial-validation-matrix.md) — wave 5, depends on M2-009, M2-014, M0-010
- [M2-018 — Close route-context and guard type tests](M2-018-close-route-context-and-guard-type-tests.md) — wave 5, depends on M2-011, M2-012, M2-014
- [M2-GATE — Verify validation, guards, security, and context contracts](M2-GATE-verify-validation-guards-security-and-context-contracts.md) — wave 6, depends on M2-001, M2-002, M2-003, M2-004, M2-005, M2-006, M2-007, M2-008, M2-009, M2-010, M2-011, M2-012, M2-013, M2-014, M2-015, M2-016, M2-017, M2-018
