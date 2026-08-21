# Basic proof application

A minimal M1 proof using the public design surface: native health response, typed JSON, params, text, redirect, and a Problem Details response.

```bash
bun run examples/basic/server.ts
curl http://localhost:3000/health
curl http://localhost:3000/hello
curl http://localhost:3000/echo/42
curl -i http://localhost:3000/plain
curl -i http://localhost:3000/login
curl -i http://localhost:3000/does-not-exist
```

Expected: `OK`, JSON bodies, `text/plain` output, a 302 `Location: /health`, and a 404 Problem Details response. The example deliberately has no validation, guards, domain logic, or authentication.
