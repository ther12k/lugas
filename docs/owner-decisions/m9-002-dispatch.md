---
type: Owner Decision Record
title: 'ODR-0011: M9-002 Dispatch — Cookie Primitives and Auth Interoperability'
status: accepted
tags:
- owner-decision
- m9
- cookies
- auth-interop
---

# ODR-0011: M9-002 Dispatch — Cookie Primitives and Auth Interoperability

## Context

The `v0.1.0-beta.3` candidate (Drizzle, M9-001) is attested on `main` (source
`f3c72e6`), and the docs site carries the seven per-topic guides. Per the
owner-directed post-beta.2 sequence recorded in ODR-0010, item (a) is cookie
primitives with an auth-interop recipe — Better Auth as the integration
example, explicitly **not** a first-party auth system. Applications can parse
and set cookies through native `Headers` today, so a first-party surface is
justified only by what raw headers cannot express: RFC 6265 correctness,
fail-closed serialization diagnostics, and composition with the typed response
helpers. [ADR-0027](../okf/decisions/0027-cookies-auth-interop.md) fixes the
contract.

## Decision

1. **M9-002 ([#362](https://github.com/ther12k/lugas/issues/362)) is
   dispatched** under ADR-0027: two additive root exports —
   `parseCookies(request)` (lenient RFC 6265 read) and
   `cookie(name, value, attrs?)` (strict, fail-closed `Set-Cookie`
   serialization composing with `json`/`text`/`problem` via `init.headers`).
   No session store, no signing, no CSRF machinery, no identity types — the
   ODR-0010 standing non-goals apply unchanged. The Better Auth interop ships
   as a documented, tested guard composition in `docs/cookies.md`, not as a
   dependency.
2. **Sequence confirmation:** after M9-002, the next batteries remain (b)
   WebSockets with typed upgrade guards and shutdown semantics, then (c)
   secure headers and health/readiness helpers, then (d) multipart, OTel
   hooks, compression/ETag, rate-limit contract — each requiring its own
   issue, ADR, and ODR before implementation starts.
3. **Protected-file authority (this issue only):** M9-002 may edit
   `src/index.ts` (protected) for the two additive type-and-value export
   lines. `package.json` and `bun.lock` must remain **untouched** (no new
   subpath, no dependencies — ADR-0027 packaging rule);
   `src/client/index.ts`, `src/testing/index.ts`, `tsconfig*.json`, and
   workflows remain untouched. Diagnostics goldens regenerate via
   `scripts/update-goldens.ts --apply` with the reason recorded in the
   evidence report.

## Effect

- The M9-002 worktree may be created from a green base containing this
  record (`docs/m9-002-governance` merge).
- On completion with full evidence, the roadmap's cookie row flips to
  shipped-on-`main`, and `docs/cookies.md` joins the synced site pages.
- npm publication, dist-tag moves, and any new release candidate remain
  owner-controlled actions.
