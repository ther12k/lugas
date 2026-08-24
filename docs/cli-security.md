# CLI Security Model

## Trust boundary

`lugas routes` / `lugas inspect <entry>` execute arbitrary application code
in a subprocess. The CLI process itself is never exposed to that code —
isolation is enforced via `Bun.spawnSync` with a bounded timeout.

## Guarantees

- **Timeout**: child killed after configurable timeout (default 5 s).
- **Isolation**: user modules never share the CLI's memory space.
- **Redaction**: framework-generated error messages never contain header
  values, request bodies, or service data. Module-author error messages ARE
  surfaced (they are part of the app's own diagnostic output).

## Limitations

- Importing untrusted code is inherently risky; subprocess isolation limits
  blast radius but does not eliminate it.
- Environment variables are inherited by the subprocess — apps can read
  them. This is intentional (apps need env vars to function) but documented
  as a trust boundary.
