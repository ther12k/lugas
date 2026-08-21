# M2 Route Context and Guard Type Contract Report

## Summary

Validates the complete compile-time type system for input schemas and guard context enrichment in M2:

1. **Input Schemas:** Transformed outputs for `params`, `query`, `headers`, and `body` are strictly inferred from `StandardSchema` output types.
2. **Raw Params Fallback:** When no `params` schema is declared, `params` defaults strictly to `Record<string, string>`.
3. **Guard Context Enrichment:** Chained guards accumulate exact intersection types (`G1 & G2 & ... & Gn`) for downstream guards and route handlers without `never` poisoning from short-circuit response unions.
4. **Short-Circuit Response Unions:** Guard failure statuses (e.g. 401 Unauthorized, 403 Forbidden) and handler success responses (e.g. 200 OK, 201 Created) merge into `RouteResponseUnion`.
5. **Discriminant Extraction:** `ExtractResponseStatus<R>` and `ExtractResponseBody<R, Status>` accurately extract body types per status code for typed client generation (M3).
6. **Type Performance:** Strict compilation across the entire M2 type matrix runs in <1s with zero type errors.
