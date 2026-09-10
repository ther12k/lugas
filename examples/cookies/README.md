# Cookies and auth interop example

Demonstrates the M9-002 cookie primitives ([ADR-0027](../../docs/okf/decisions/0027-cookies-auth-interop.md)):

- `POST /login` sets a session cookie via `cookie()` composed with `json()` `init.headers` (`HttpOnly`, `SameSite=Lax`, `Max-Age`).
- `GET /me` is guarded: the guard reads the cookie with `parseCookies()` and enriches the context — the auth-interop pattern from `docs/cookies.md`.
- `POST /logout` deletes the cookie by expiring it (`maxAge: 0`).

```bash
bun run examples/cookies/server.ts
curl -i -X POST localhost:3007/login          # observe Set-Cookie
curl localhost:3007/me -H "Cookie: demo-session=secret-token"
curl -X POST localhost:3007/logout -i         # observe expiry
```
