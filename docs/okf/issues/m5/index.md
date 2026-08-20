# M5 — Hardening and Private Alpha

Tasks and gates: **18**.

- [M5-001 — Freeze benchmark harness methodology and environment manifest](M5-001-freeze-benchmark-harness-methodology-and-environment-manifest.md) — wave 1, depends on M4-GATE, M0-007, M0-008, M1-GATE
- [M5-002 — Measure raw Bun versus Lugas plain-route overhead](M5-002-measure-raw-bun-versus-lugas-plain-route-overhead.md) — wave 2, depends on M5-001, M2-GATE
- [M5-003 — Measure feature-equivalent validation and guard pipelines](M5-003-measure-feature-equivalent-validation-and-guard-pipelines.md) — wave 2, depends on M5-001, M2-GATE
- [M5-004 — Measure 1,000 and 10,000 route startup and memory](M5-004-measure-1-000-and-10-000-route-startup-and-memory.md) — wave 2, depends on M5-001, M1-GATE
- [M5-005 — Measure client bundle and TypeScript contract cost](M5-005-measure-client-bundle-and-typescript-contract-cost.md) — wave 2, depends on M5-001, M3-GATE
- [M5-006 — Integrate Bun CPU, heap, and metafile diagnostics](M5-006-integrate-bun-cpu-heap-and-metafile-diagnostics.md) — wave 2, depends on M5-001, M4-GATE
- [M5-007 — Install performance, size, and type regression gates](M5-007-install-performance-size-and-type-regression-gates.md) — wave 3, depends on M5-002, M5-003, M5-004, M5-005, M5-006
- [M5-008 — Perform the full malformed-input and redaction security review](M5-008-perform-the-full-malformed-input-and-redaction-security-review.md) — wave 1, depends on M4-GATE, M2-017, M4-005
- [M5-009 — Audit dependencies, licenses, package contents, and SBOM](M5-009-audit-dependencies-licenses-package-contents-and-sbom.md) — wave 1, depends on M4-GATE, M1-018, M3-018, M4-017
- [M5-010 — Run Bun 1.4.x compatibility on Linux, macOS, and Windows](M5-010-run-bun-1-4-x-compatibility-on-linux-macos-and-windows.md) — wave 1, depends on M0-004, M4-GATE
- [M5-011 — Close static, file, directory, and native passthrough security tests](M5-011-close-static-file-directory-and-native-passthrough-security-tests.md) — wave 1, depends on M4-GATE, M1-008, M0-006
- [M5-012 — Stress synchronous and asynchronous guards and validators](M5-012-stress-synchronous-and-asynchronous-guards-and-validators.md) — wave 1, depends on M4-GATE, M2-GATE
- [M5-013 — Stress cancellation, abort, slow bodies, and client transport](M5-013-stress-cancellation-abort-slow-bodies-and-client-transport.md) — wave 1, depends on M4-GATE, M2-GATE, M3-013
- [M5-014 — Run 10,000-route runtime and type stress closure](M5-014-run-10-000-route-runtime-and-type-stress-closure.md) — wave 3, depends on M3-017, M5-004
- [M5-015 — Review API consistency against principles and Elysia lessons](M5-015-review-api-consistency-against-principles-and-elysia-lessons.md) — wave 1, depends on M4-GATE
- [M5-016 — Build the production-shaped CRUD proof API](M5-016-build-the-production-shaped-crud-proof-api.md) — wave 1, depends on M4-GATE, M4-013
- [M5-017 — Assemble the private alpha review and release packet](M5-017-assemble-the-private-alpha-review-and-release-packet.md) — wave 4, depends on M5-002, M5-003, M5-004, M5-005, M5-007, M5-008, M5-009, M5-010, M5-011, M5-012, M5-013, M5-014, M5-015, M5-016
- [M5-GATE — Verify private alpha hardening and evidence](M5-GATE-verify-private-alpha-hardening-and-evidence.md) — wave 5, depends on M5-001, M5-002, M5-003, M5-004, M5-005, M5-006, M5-007, M5-008, M5-009, M5-010, M5-011, M5-012, M5-013, M5-014, M5-015, M5-016, M5-017
