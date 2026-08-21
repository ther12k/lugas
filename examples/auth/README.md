# Authentication & Guard Proof Application

Demonstrates application-level authentication, role authorization, and context enrichment chaining using Lugas guards. Note: Authentication logic is explicitly defined by the application using guards, not as a built-in framework feature.

```bash
bun run examples/auth/server.ts

# 1. Public route
curl http://localhost:3002/public

# 2. Protected profile (401 when unauthorized)
curl -i http://localhost:3002/profile

# 3. Authenticated profile (Member token)
curl -H "Authorization: Bearer member-token" http://localhost:3002/profile

# 4. Role-guarded route (403 Forbidden for member)
curl -i -H "Authorization: Bearer member-token" http://localhost:3002/admin/dashboard

# 5. Role-guarded route (200 OK for admin)
curl -H "Authorization: Bearer admin-token" http://localhost:3002/admin/dashboard
```
