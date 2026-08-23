# M3 Client Matrix Report (M3-015)

Traceability from every M3 runtime client criterion to its executable test.
All tests are deterministic and contact no public internet (injected
transports or localhost servers only).

## Criterion → test map

| Source issue | Runtime criterion | Test location |
|---|---|---|
| M3-006 | Base config validation; fetch injection preserved; frozen handle; erased `<API>` | `tests/unit/client-config.test.ts` |
| M3-006 | Browser-safe surface (no Bun, no Proxy) | `tests/package/client-browser/*`, source scans in `client-methods.test.ts` |
| M3-007 | Exact uppercase verbs; contract-restricted paths; enumerable method surface; escape hatch | `tests/client/url-and-serialization.matrix.test.ts` (methods table); `tests/unit/client-methods.test.ts`; `tests/types/client-methods.test-d.ts` |
| M3-008 | Exact-once param substitution; reserved-char containment; Unicode encoding; wildcard forms; `LUGAS_CLIENT_001..005` before fetch | `tests/client/url-and-serialization.matrix.test.ts` (path tables); `tests/unit/client-path.test.ts`; `tests/security/client-path.test.ts` |
| M3-009 | Repeated keys / empty strings / undefined omission; encode-once; policy violations `LUGAS_CLIENT_006`; server round-trip | `tests/client/url-and-serialization.matrix.test.ts` (query tables); `tests/unit/client-query.test.ts`; `tests/integration/client-query-roundtrip.test.ts` |
| M3-010 | Single header channel; JSON body + content-type rules; init ownership `007`; header validation `009`; signal identity | `tests/client/request-and-response.matrix.test.ts` (request tables); `tests/unit/client-request.test.ts`; `tests/security/client-header.test.ts` |
| M3-011 | Actual-status branching; media helpers; unknown media/status explicit; clone policy | `tests/client/request-and-response.matrix.test.ts` (response tables incl. 599 + octet-stream rows); `tests/unit/client-result.test.ts` |
| M3-012 | Bodiless statuses never parse; Problem Details under `error`; single decode-error policy `LUGAS_CLIENT_010` | `tests/client/request-and-response.matrix.test.ts` (malformed section); `tests/unit/client-response-formats.test.ts`; `docs/client-error-semantics.md` |
| M3-013 | Transport failures keep identity/cause; aborts propagate; HTTP failures returned not thrown; zero retry | `tests/client/failure-behavior.matrix.test.ts`; `tests/unit/client-transport-failure.test.ts` |

## Coverage notes

- Every URL/header/body assertion compares exact values — no snapshot
  files exist in this suite.
- Unknown media (`application/octet-stream`) is asserted to leave the
  original stream unconsumed; unknown status `599` is asserted to classify
  by `Response.ok`.
- Missing runtime values are exercised for every structured slot with their
  stable diagnostics (`001`, `006`, `007`, `008`, `009`) plus dispatch-blocking checks.
