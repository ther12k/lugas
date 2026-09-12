---
type: Issue Evidence Report
title: 'CA-7 — The multipart 413 branch admits an absent payload (transport-ceiling collision)'
status: complete
tags:
- evidence
- client
- types
- boundary
---

# CA-7 Evidence Report

Source-level review finding (owner, 2026-09-12) against CA-6 at merge commit `e05775b`: the multipart union's `413` branch typed its payload as always-present `FrameworkProblemBody`, while `docs/body-limits.md` documents that Bun's transport ceiling can reject a request with a BARE 413 (empty body) before the framework handles it. Declaring `form()` does not exclude that path — `maxRequestBodySize` applies to every request. On a form route, `status: 413` therefore cannot distinguish a Lugas Problem 413 from a bare transport 413, for which the decoder returns `error: undefined` — yet the old type let consumers read `result.error.code` unchecked.

## Baseline

Branch base: origin/main `e05775b`. The CA-6 union member: `{ status: 413; body: FrameworkProblemBody<"FORM_LIMIT_EXCEEDED" | "BODY_BUDGET_EXCEEDED", 413> }` — a false always-Problem promise for the one status where a payloadless outcome is documented wire behavior.

## Outcome

The minimal correction exactly as recommended: the multipart 413 payload is now **absentable** — `FrameworkProblemBody<…> | undefined` — so `result.error.code` on a 413 is a compile error until the consumer narrows (`if (result.error !== undefined)`, which is exactly the honest check: defined ⇒ Lugas-generated Problem, undefined ⇒ transport rejection with no manufactured body). The decoder is untouched; success types are untouched; no synthetic error body is created. 415/400 on form routes keep their always-present payloads (only the framework can produce those — the transport only rejects on size).

## Files changed

Owned (CA-7):

- `src/client/types.ts` — `MultipartFailureOutcomes` 413 member payload `| undefined` + comment
- `tests/types/client-form-body.test-d.ts` — absentable-type assertion; compile-level proof via `@ts-expect-error` that unchecked `.code` access on a 413 failure is an error, and that narrowing restores the literal code union
- `tests/forms/client-form.test.ts` — runtime regression under both conditions on the SAME typed route: Lugas `maxFileSize` 413 below the ceiling → 413 + `FORM_LIMIT_EXCEEDED` body (narrowed access); Bun `maxRequestBodySize` 413 before form processing → 413 + `error === undefined`
- `docs/client.md` — boundary rewritten: the transport ceiling can bare-413 `form()` routes; payload absentable; narrow before field access

Adjacent: none. Protected: none.

## Assumptions

- The runtime transport behavior is as documented (`docs/body-limits.md`, M7-002 pin): this regression now ALSO pins it from the client side with a live `maxRequestBodySize: 16` server, so a future Bun change that starts emitting a body on transport 413s will surface as a test failure rather than a silent type lie.

## Acceptance mapping (review table)

| Condition | Expected | Covered by |
|---|---|---|
| Lugas `maxFileSize` exceeded, below the native ceiling | 413 + documented Problem body | pre-existing CA-6 test, now with narrowed access |
| Bun `maxRequestBodySize` exceeded before form processing | documented transport rejection, no Problem promise | new CA-7 runtime test (`error === undefined`) + `@ts-expect-error` compile proof |

## Exact commands and results

```
bun run typecheck                          → PASS (the CA-6 test sites required exactly the narrowing the new type demands — evidence the change bites)
bun test tests/forms/client-form.test.ts   → 6 pass, 0 fail
bun run verify                             → exit 0 (all steps PASS)
```

## Security considerations

None — type-level honesty fix; no runtime change.

## Known limitations / Not exercised

- No discriminator identifying the rejection ORIGIN is added (the review noted the decoder does not and should not fabricate one); origin remains inferable only via payload presence. A future `LUGAS_CLIENT` header or similar would be a separate contract decision.

## Deferred work

- None.

## Dependency / merge notes

- Directly amends CA-6 (PR #409); no other overlap.

## Working-tree state

Clean after commit: files listed above plus `docs/reports/issues/CA-7.md`.
