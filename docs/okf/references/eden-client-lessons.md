---
type: Reference
title: Eden Treaty and Eden Fetch — Typed Client Lessons
status: stable
tags:
- reference
- eden
- client
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Eden Treaty and Eden Fetch — Typed Client Lessons

**Official sources:**

- https://elysiajs.com/eden/treaty/overview
- https://elysiajs.com/eden/fetch

**Retrieved:** 2026-08-21

## Value demonstrated

Eden shows that exporting a server application type can give frontend callers route, input, and response inference without a manually maintained SDK.

## Constraints relevant to Lugas

- Eden is designed around Elysia application types and version compatibility.
- Tree/Proxy syntax is convenient but requires path-to-property mapping and deeper type transformations.
- A fetch-style client is more explicit and can have better type-system characteristics for large APIs.

## Lugas conclusion

Build the capability, not the dependency. Lugas owns an explicit method/path client, a discriminated result model, and its own type-performance budgets. A tree façade remains replaceable and optional.
