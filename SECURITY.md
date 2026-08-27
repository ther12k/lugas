# Security Policy

## Supported Versions

Only the latest release of LugasJS receives security updates.

| Version | Supported |
|---|---|
| `0.1.x` (beta) | :white_check_mark: |
| `< 0.1.0` | :x: |

## Reporting a Vulnerability

We take the security of LugasJS seriously. If you believe you have discovered a vulnerability:

1. **Do not open a public issue.**
2. Report the vulnerability privately via GitHub Security Advisories at `https://github.com/ther12k/lugas/security/advisories/new` or by contacting the project maintainers directly.
3. Include a detailed reproduction scenario, proof of concept, and affected version(s).

### Response Timeline

- **Initial Response:** Within 48 hours.
- **Triage & Reproduction:** Within 5 business days.
- **Fix & Disclosure:** Coordinated release and advisory published alongside the patch release.

## Security Architecture & Guarantees

LugasJS enforces:
- **Redacted Error Policies:** Framework internals, thrown error messages, and stack traces are redacted from HTTP responses in production mode.
- **Validation Fail-Closed:** Invalid request parameters, headers, and payloads fail with stable RFC 9457 Problem Details.
- **Prototype Pollution Defense:** Dictionaries created for normalized context employ null-prototype objects.
- **No Unsafe Global Mutation:** Route definitions and guard chains are deeply frozen at app preparation time.
