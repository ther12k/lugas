# M3 — Typed Contract and Client

Tasks and gates: **19**.

- [M3-001 — Extract the application route contract type](M3-001-extract-the-application-route-contract-type.md) — wave 1, depends on M2-GATE, M1-GATE, M0-009
- [M3-002 — Derive method-specific path and input lookup types](M3-002-derive-method-specific-path-and-input-lookup-types.md) — wave 2, depends on M3-001, M2-GATE
- [M3-003 — Extract status and body response unions](M3-003-extract-status-and-body-response-unions.md) — wave 2, depends on M3-001, M1-003
- [M3-004 — Merge guard responses into client outcome types](M3-004-merge-guard-responses-into-client-outcome-types.md) — wave 3, depends on M3-003, M2-012
- [M3-005 — Generate 25, 100, 500, and 1,000 route type fixtures](M3-005-generate-25-100-500-and-1-000-route-type-fixtures.md) — wave 2, depends on M3-001
- [M3-006 — Implement `createClient` base configuration and fetch injection](M3-006-implement-createclient-base-configuration-and-fetch-injection.md) — wave 3, depends on M3-002
- [M3-007 — Add typed explicit HTTP methods and path restrictions](M3-007-add-typed-explicit-http-methods-and-path-restrictions.md) — wave 4, depends on M3-002, M3-006
- [M3-008 — Implement path-parameter interpolation and encoding](M3-008-implement-path-parameter-interpolation-and-encoding.md) — wave 5, depends on M3-007
- [M3-009 — Implement query serialization matching server decoding](M3-009-implement-query-serialization-matching-server-decoding.md) — wave 5, depends on M3-007, M2-004
- [M3-010 — Implement headers, JSON body, and RequestInit merging](M3-010-implement-headers-json-body-and-requestinit-merging.md) — wave 5, depends on M3-007, M2-007
- [M3-011 — Parse HTTP responses into discriminated client results](M3-011-parse-http-responses-into-discriminated-client-results.md) — wave 5, depends on M3-003, M3-007
- [M3-012 — Freeze JSON, text, empty, problem, and decode-failure semantics](M3-012-freeze-json-text-empty-problem-and-decode-failure-semantics.md) — wave 6, depends on M3-011, M1-003
- [M3-013 — Preserve network, abort, and raw fetch failure behavior](M3-013-preserve-network-abort-and-raw-fetch-failure-behavior.md) — wave 6, depends on M3-011
- [M3-014 — Prove the client export is browser-safe and Bun-free](M3-014-prove-the-client-export-is-browser-safe-and-bun-free.md) — wave 7, depends on M3-006, M3-007, M3-008, M3-009, M3-010, M3-011, M3-012, M3-013
- [M3-015 — Close the client unit and adversarial matrix](M3-015-close-the-client-unit-and-adversarial-matrix.md) — wave 7, depends on M3-008, M3-009, M3-010, M3-011, M3-012, M3-013
- [M3-016 — Prove full server-to-client contract behavior](M3-016-prove-full-server-to-client-contract-behavior.md) — wave 8, depends on M2-GATE, M3-015
- [M3-017 — Establish the TypeScript performance gate and fallback policy](M3-017-establish-the-typescript-performance-gate-and-fallback-policy.md) — wave 5, depends on M3-004, M3-005, M3-007
- [M3-018 — Finalize `lugas/client` exports and packed consumer tests](M3-018-finalize-lugas-client-exports-and-packed-consumer-tests.md) — wave 8, depends on M3-014, M3-017
- [M3-GATE — Verify end-to-end client types, runtime behavior, and type cost](M3-GATE-verify-end-to-end-client-types-runtime-behavior-and-type-cost.md) — wave 9, depends on M3-001, M3-002, M3-003, M3-004, M3-005, M3-006, M3-007, M3-008, M3-009, M3-010, M3-011, M3-012, M3-013, M3-014, M3-015, M3-016, M3-017, M3-018
