---
type: Architecture Decision Record
title: 'ADR-0001 — Product Name: LugasJS'
status: accepted
tags:
- adr
- architecture
- '0001'
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# ADR-0001 — Product Name: LugasJS

## Status

Accepted as the LugasJS design baseline. Implementation remains subject to milestone verification.

## Context

The framework needs a distinctive name that reflects clarity and directness without binding the product name to a specific Bun release or sounding like a temporary wrapper.

## Decision

The official product name is **LugasJS**, shortened to **Lugas** in conversation and code. The tagline is **“Clear, typed APIs on native Bun.”** Package, organization, and domain assets remain provisional until owner-controlled availability and legal checks.

## Consequences

- The brand reinforces the requirement to keep the API direct and unsurprising.
- Documentation may use “Lugas” without repeating “JS”.
- Import paths may change before publication if registry ownership is unavailable.

## Alternatives considered

- A Bun-prefixed name: rejected because the runtime commitment belongs in positioning, not necessarily the brand.
- A generic English speed name: rejected as crowded and less connected to the design purpose.
- Keep a working codename: rejected because the owner requested a final framework name.

## Validation and revisit trigger

M6-004 verifies current package, repository, domain, and naming risks. A collision may change package scope without changing the product name.
