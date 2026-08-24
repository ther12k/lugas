---
type: Security Review
title: M5 Full Malformed-Input and Redaction Security Review
status: complete
tags:
- security
- redaction
- m5
---

# M5 Security Review

Scope: all diagnostic/problem/log paths, malformed URL/query/header/body/validator inputs, and native directory route use.

## Findings summary

| Area | Finding | Severity | Status |
|---|---|---|---|
| Path errors | No secret leakage in message or formatted output | — | Clean |
| Query errors | No secret leakage; error text is policy-only | — | Clean |
| Request errors | Header NAMES surfaced but VALUES never included | — | Clean |
| Decode errors | Body content never enters diagnostic messages | — | Clean |
| formatDiagnostic | No stack traces, no causes, no env values in any output format | — | Clean |
| URL traversal | Encoded path traversal does not escape route matching (Bun normalizes) | Low | Documented |
| Null bytes | Handled safely by Bun router; no crash | Low | Documented |
| Deep JSON nesting | Rejected by parser without stack overflow | — | Clean |
| Binary garbage under JSON CT | Produces 4xx, never 5xx or crash | — | Clean |
| Oversized headers | Bun handles; server does not crash | Low | Platform-dependent |
| Duplicate query keys | Arrays match decoder semantics (M2-004) | — | Clean |
| Empty query values | Preserved through pipeline | — | Clean |

## Residual risk

- Module-author error messages ARE surfaced via stderr (by design); framework does not censor user-generated error text.
- Native directory routes serve files from disk; application is responsible for not placing sensitive files in the served directory.
- Opaque browser redirects and macOS/Windows socket semantics remain untested (platform gaps).
