# Drizzle

One concept: an application-owned Drizzle instance declared as a Lugas service via `lugas/drizzle` — startup validation, typed `ctx.services` access, opt-in `closeOnDispose`.

```bash
bun run examples/drizzle/server.ts
```

```bash
curl http://localhost:3000/users
```

Reference: [`docs/drizzle.md`](../../docs/drizzle.md).
