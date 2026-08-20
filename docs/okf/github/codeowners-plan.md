---
type: Governance Plan
title: Proposed CODEOWNERS and Sensitive Paths
status: draft
tags:
- codeowners
- governance
- github
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T01:21:34+07:00'
---

# Proposed CODEOWNERS and Sensitive Paths

Populate real usernames/teams only after repository ownership is decided.

```text
/src/core/response*          @core-maintainers
/src/internal/compile*       @core-maintainers @performance-reviewers
/src/internal/validation*    @core-maintainers @security-reviewers
/src/client/**               @client-maintainers @type-reviewers
/src/testing/**              @test-maintainers
/src/cli/**                  @tooling-maintainers @security-reviewers
/src/index.ts                @release-integrators
/package.json                @release-integrators
/bun.lock                    @release-integrators
/.github/workflows/**        @release-integrators @security-reviewers
/docs/okf/decisions/**       @architecture-owners
/docs/okf/delivery/**        @program-integrators
```

## Sensitive change rule

Changes to validation, guard execution, error redaction, client URL building, package publishing, or CI credentials require an independent security-aware review even when formal CODEOWNERS is unavailable.
