---
type: Owner Decision Record
title: 'ODR-0002: Open-Source License, Notices, and Project Governance'
status: accepted
tags:
- owner-decision
- license
- governance
- release
- m6
---

# ODR-0002: Open-Source License, Notices, and Project Governance

## Context

LugasJS requires an explicit open-source license, copyright notice, vulnerability disclosure standard, and governance framework before public beta candidate release.

## Decision

1. **License Selection:**
   - The project is licensed under the **Apache License 2.0** (`Apache-2.0`).
   - The canonical full-text license is provided in `LICENSE`.
   - Copyright notice is provided in `NOTICE`.

2. **Security Policy:**
   - Documented in `SECURITY.md`.
   - Private vulnerability disclosures are directed to GitHub Security Advisories with maintainer triage response within 48 hours.

3. **Governance & Maintainership:**
   - Documented in `GOVERNANCE.md`.
   - Lead Maintainer / BDFL: Rizky Zulkarnaen (`@ther12k`).
   - Release and publication authority is strictly held by the lead maintainer.

4. **Third-Party Dependency & Notice Policy:**
   - LugasJS maintains zero production runtime dependencies.
   - Development dependencies (Zod, Valibot, Standard Schema, TypeScript) are permissively licensed (MIT / Apache-2.0).
