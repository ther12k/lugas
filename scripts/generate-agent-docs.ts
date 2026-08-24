/**
 * Agent documentation generator (M4-015).
 *
 * Generates `llms-full.txt` (complete public API reference) and
 * `skills/lugas/SKILL.md` (task recipes for coding agents).
 *
 * Usage: bun run scripts/generate-agent-docs.ts [--check]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const check = process.argv.includes("--check");

const FRAMEWORK_VERSION = JSON.parse(
  readFileSync(resolve(ROOT, "package.json"), "utf8"),
).version as string;

const LLM_FULL = `# Lugas — Full Agent Reference

Version: ${FRAMEWORK_VERSION}

## Purpose

Lugas is a Bun-native HTTP framework with derived types, Standard Schema
validation, ordered guards, and a typed client.

## Non-negotiable constraints

- No custom router — uses Bun's native route matching.
- No Eden or Elysia dependency.
- Runtime facts and compile-time contract are separate systems.
- Public API is small, explicit, object-based, and statically searchable.

## Server API: defineApp + route

\`\`\`ts
import { defineApp } from "lugas";
import { route } from "lugas";
import { json } from "lugas";
import { z } from "zod";

const app = defineApp({
  routes: {
    "/users/:id": {
      GET: route({
        params: z.object({ id: z.string() }),
        query: z.object({ verbose: z.boolean().optional() }),
        handler: ({ params, query }) => json(200, { id: params.id }),
      }),
    },
    "/users": {
      POST: route({
        body: z.object({ name: z.string() }),
        before: [authGuard],
        handler: ({ body }) => json(201, { created: true, name: body.name }),
      }),
    },
  },
});
\`\`\`

## Validation (Standard Schema v1)

Use zod or valibot on any of the four slots:

\`\`\`ts
route({
  params: z.object({ id: z.coerce.number() }),   // transformed output
  query: z.object({ q: z.string().optional() }),
  headers: z.object({ authorization: z.string() }),
  body: z.object({ name: z.string(), tags: z.array(z.string()).optional() }),
  handler: ({ params, query, headers, body }) => {
    // params.id is number; query.q is string | undefined
  },
});
\`\`\`

## Guards

Ordered guards short-circuit with a Response or pass enrichment objects:

\`\`\`ts
const auth = guard({
  name: "auth",
  handler: () => json(401, { error: "unauthorized" }), // short-circuit
});

const enrich = guard({
  name: "enrich",
  handler: () => ({ user: { id: "u1" } }), // merged into ctx
});
\`\`\`

Guards run in declaration order. Later guards cannot silently shadow earlier
keys with different types (compile-time never).

## Responses

\`\`\`ts
json(200, { data: "..." })       // application/json
text(200, "hello")               // text/plain
empty(204)                       // no content
problem(404, { title: "Not found", code: "NOT_FOUND" })
redirect("/other")               // 302
\`\`\`

## Typed client

\`\`\`ts
import { createClient } from "lugas/client";
import type { AppContract } from "lugas";

type API = AppContract<typeof app>;
const client = createClient<API>({ baseUrl: "https://api.example.com" });

// Path restrictions are compile-time enforced:
const res = await client.get("/users/42", { query: { verbose: true } });
if (res.ok) console.log(res.data);
else console.log(res.status, res.error);
\`\`\`

## Test server helper

\`\`\`ts
import { createTestServer } from "lugas/testing";

const ts = createTestServer(app); // ephemeral port, typed .client included
const res = await ts.client.get("/users/42");
await ts.stop(); // deterministic cleanup
\`\`\`

## Manifest inspection

\`\`\`ts
const manifest = app.manifest; // readonly lugas-manifest-v1 object
console.log(manifest.routes.length, manifest.modules);
\`\`\`

## CLI

\`\`\`bash
bun run src/cli/main.ts routes ./src/app.ts       # human-readable table
bun run src/cli/main.ts inspect ./src/app.ts      # JSON manifest to stdout
\`\`\`

## Worktree workflow

\`\`\`bash
git worktree add .worktrees/<ISSUE-ID> -b agent/<ISSUE-ID>-<slug> main
# work in .worktrees/<ISSUE-ID>
git add -A && git commit && git push -u origin agent/<ISSUE-ID>-<slug>
gh pr create && gh pr merge --merge
git worktree remove .worktrees/<ISSUE-ID>
\`\`\`

## Diagnostic codes

| Code | Raised by | Meaning |
|---|---|---|
| LUGAS_CLIENT_001–005 | path | missing/extra/invalid/ambiguous/template |
| LUGAS_CLIENT_006 | query | query value policy violation |
| LUGAS_CLIENT_007–009 | request | ownership/content-type/header validation |
| LUGAS_CLIENT_010 | decode | malformed declared JSON |
| LUGAS_APP_001–006 | defineApp | config validation |
| LUGAS_MODULE_001–005 | defineModule | module validation |
| LUGAS_ROUTE_001–005 | route() | descriptor validation |
| LUGAS_GUARD_001–004 | guard() | guard validation |
| LUGAS_ROUTES_001–004 | compose/serve | duplicate/unsupported/invalid paths |

## Prohibited patterns

- Do NOT use Proxy for routing or method dispatch.
- Do NOT import server modules in client code.
- Do NOT use \`any\` at public boundaries.
- Do NOT add features not assigned to an issue.
- Do NOT weaken tests to make them pass.

## Current limitations

- macOS/Windows untested (Linux x86-64 only in CI).
- \`.d.ts\` declarations deferred to release tooling.
- Opaque browser redirects not exercised.
`;

const SKILL_MD = `---
name: lugas
description: Bun-native HTTP framework with typed contract, Standard Schema validation, ordered guards, and discriminated client results.
---

# Lugas Framework Skill

## When to use this skill

Use when creating HTTP servers, REST APIs, or type-safe clients on Bun.
Lugas provides compile-time path restrictions, schema-derived context types,
and runtime manifest truth.

## Task recipes

### Add a new route

1. Open your app definition file (where \`defineApp()\` is called).
2. Add an entry under \`routes\` with an uppercase HTTP method key.
3. Use \`route({...})\` with optional schemas and required \`handler\`.
4. The handler receives derived context types automatically.

### Add validation

1. Pass a Standard Schema (zod/valibot) to any of \`params/query/headers/body\`.
2. Schema outputs appear as typed properties on the handler context.
3. Transformed params (e.g. \`z.coerce.number()\`) arrive as their transformed type.

### Add authentication

1. Create guards with \`guard({ name, handler })\`.
2. Return a Response (\`json(401, ...)\`) to short-circuit.
3. Return an object to pass through and merge enrichment into context.
4. List guards in execution order via \`before: [authGuard]\`.

### Write a test

1. Import \`createTestServer\` from \`lugas/testing\`.
2. Call \`createTestServer(app)\` — returns ephemeral server with typed \`.client\`.
3. Use \`.client.get()/post()/...\` for typed calls or \`.fetch()\` for raw requests.
4. Always call \`ts.stop()\` in a finally block.

### Inspect routes

1. Run \`bun run src/cli/main.ts routes ./src/app.ts\` for human-readable table.
2. Run \`bun run src/cli/main.ts inspect ./src/app.ts\` for JSON manifest.

### Run tests

\`\`\`bash
bun run verify          # full gate: typecheck + test + docs + diff
bun test                # all tests
bun test tests/unit/    # unit only
\`\`\`

## Prohibited patterns

- Never use \`Proxy\` for routing or dispatch.
- Never import server modules in client code.
- Never use \`any\` at public API boundaries.
- Never return non-Response values from handlers (use \`json()\`, \`text()\`, etc.).

## Error codes

All framework diagnostics carry stable codes starting with \`LUGAS_\`.
See \`docs/diagnostics.md\` for the complete catalog.

## Key files to reference

- \`docs/examples.md\` — links to runnable examples
- \`docs/client-error-semantics.md\` — error/redaction policy
- \`examples/basic/\` — minimal app
- \`examples/validation/\` — schema usage
- \`examples/auth/\` — guards with enrichment
- \`tests/conformance/\` — cross-component invariant suite
`;

writeFileSync(resolve(ROOT, "llms-full.txt"), LLM_FULL);
mkdirSync(resolve(ROOT, "skills", "lugas"), { recursive: true });
writeFileSync(resolve(ROOT, "skills", "lugas", "SKILL.md"), SKILL_MD);

if (check) {
  // Verify committed files match generated output
  const committedFull = readFileSync(resolve(ROOT, "llms-full.txt"), "utf8");
  const committedSkill = readFileSync(resolve(ROOT, "skills/lugas/SKILL.md"), "utf8");
  if (committedFull !== LLM_FULL || committedSkill !== SKILL_MD) {
    console.error("agent docs are STALE — rerun without --check to regenerate");
    process.exit(1);
  }
  console.log("agent docs up to date");
} else {
  console.log(`generated llms-full.txt (${LLM_FULL.length} bytes)`);
  console.log(`generated skills/lugas/SKILL.md (${SKILL_MD.length} bytes)`);
}
