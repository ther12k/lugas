# Security Fixture Policy

Fixtures use synthetic payloads only. Never commit production secrets, raw hostile payloads, credentials, cookies, authorization headers, or unbounded body samples. Each fixture must state expected status/media type and whether behavior belongs to Bun or Lugas. Assign executable cases from `docs/security-test-matrix.md` to M1–M5 owners.
