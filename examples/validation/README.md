# Validation Proof Application

A minimal M2 proof demonstrating input validation across params, query, headers, and body using both Zod and Valibot Standard Schema validators.

```bash
bun run examples/validation/server.ts

# 1. Query validation (Zod)
curl "http://localhost:3001/search?q=lugas&page=2"
# 422 Problem on invalid query:
curl -i "http://localhost:3001/search?q=&page=abc"

# 2. Params & Header validation (Valibot + Zod)
curl -H "X-Api-Version: v1" http://localhost:3001/users/42

# 3. JSON Body validation (Zod)
curl -X POST http://localhost:3001/users/42 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'

# 415 on missing Content-Type:
curl -i -X POST http://localhost:3001/users/42 -d '{"name": "Alice"}'

# 400 on malformed JSON syntax:
curl -i -X POST http://localhost:3001/users/42 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", broken}'
```
