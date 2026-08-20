# Security Test Matrix

Threat model source: [`docs/okf/engineering/security-and-threat-model.md`](okf/engineering/security-and-threat-model.md). Bun-owned routing behavior comes from [`docs/reports/m0-bun-characterization.md`](reports/m0-bun-characterization.md).

| ID | Case | Expected | Owner | Milestone |
|---|---|---|---|---|
| URL-01 | encoded slash / `%2F` | preserve or reject per Bun oracle; never route-cross | Bun/Lugas | M1/M5 |
| URL-02 | malformed percent encoding | bounded 400/404; no throw leak | Lugas | M2 |
| Q-01 | repeated query keys | deterministic first/array policy | Lugas | M2 |
| Q-02 | prototype-like keys `__proto__`, `constructor` | inert data, no object prototype mutation | Lugas | M2/M5 |
| Q-03 | Unicode normalization and plus/percent spaces | deterministic decode | Lugas | M2 |
| H-01 | duplicate/case-varied headers | lower-case projection, deterministic collision rule | Lugas/Bun | M2 |
| JSON-01 | malformed JSON / wrong media type | 400 Problem Details, bounded issue output | Lugas | M2 |
| JSON-02 | deeply nested / oversized body | enforce body limit; no unbounded buffering | Lugas/Bun | M2/M5 |
| ABORT-01 | client abort during slow body/guard | stop work, no stale response/log secret | Bun/Lugas | M5 |
| REDACT-01 | hostile payload in diagnostics | never log raw secret/token/body | Lugas | M2/M5 |
| FILE-01 | directory traversal and static file routes | no escape outside allowed root | Bun/Lugas | M5 |
| ROUTE-01 | wrong method / wildcard precedence | preserve Bun native semantics | Bun | M0/M1 |

Golden logs must contain IDs, statuses, media types, and bounded issue paths only. Never include raw hostile payloads, authorization headers, cookies, request bodies, or tokens. Every P0 threat has a named milestone owner above.
