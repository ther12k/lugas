# CRUD Proof API

Demonstrates all Lugas alpha capabilities in one realistic in-memory API.

## Run

```bash
bun run examples/proof-api/app.ts
```

## Test

```bash
bun test tests/integration/proof-api.test.ts
```

## Covers

- CRUD operations (list, create, read, update, delete)
- Standard Schema validation (zod) on params/headers/body
- Ordered guards (auth 401 → admin 403)
- Error statuses: 404, 409, 422
- 204 No Content
- Slow route for abort testing

## Limitations

In-memory store; no persistence. Single-process only.
