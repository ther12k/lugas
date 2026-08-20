---
type: Engineering Standard
title: Bun and Lugas Conformance Matrix
status: draft
tags:
- conformance
- bun
- matrix
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Bun and Lugas Conformance Matrix

The matrix is populated with executable test IDs during M0–M5.

| Area | Cases | Raw Bun oracle | Lugas expectation |
|---|---|---:|---|
| Exact routing | exact path, slash variants, encoded path | yes | identical unless documented |
| Params | one/multiple params, Unicode, malformed escape | yes | identical raw params before schema |
| Wildcards | single wildcard, catch-all, precedence | yes | identical |
| Methods | GET/POST/etc., unsupported method, method map | yes | identical route selection |
| HEAD/OPTIONS | Bun automatic behavior | yes | pass through; do not emulate |
| Static response | object reuse, headers, body | yes | native entry remains native |
| File/directory | missing file, canonical path, traversal | yes | identical Bun security behavior |
| Fallback | unmatched request | yes | Lugas default/custom policy only |
| Server error | thrown native handler and descriptor | partial | native policy for native routes; Lugas policy contract documented |
| Params validation | valid, transform, failure | no | Lugas contract |
| Query | absent, empty, repeated, Unicode | URL oracle | documented decoding |
| Headers | case, duplicates, sensitive redaction | web standard | documented projection |
| JSON body | media type, malformed, empty, abort | web/Bun | stable 400/415/422 behavior |
| Guards | order, enrichment, stop, throw | no | deterministic Lugas behavior |
| Responses | JSON/text/empty/problem/redirect/raw | web standard | native wire behavior + typed contract |
| Client | URL, headers, body, parsing, abort | fetch standard | documented explicit client behavior |
| Cleanup | server stop/reuse/leaks | Bun | deterministic helper behavior |

Each row eventually links to test files and issue evidence through the traceability matrix.
