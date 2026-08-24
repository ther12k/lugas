/**
 * Deterministic llms.txt generator (M4-014).
 *
 * Produces a machine-oriented index of the framework: purpose, canonical
 * API, key constraints, and documentation links. Content is hardcoded here
 * (not scraped from docs) so the generator is self-contained and diff-stable.
 *
 * Usage: bun run scripts/generate-llms.ts [--check]
 *   --check  exits 1 if llms.txt is stale (for CI)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUTPUT = resolve(import.meta.dir, "..", "llms.txt");

const CONTENT = `# Lugas

A Bun-native HTTP framework with derived types, Standard Schema validation,
ordered guards, and a typed client. Server-only TSX rendering.

## Non-negotiable constraints

- No custom router — uses Bun's native route matching.
- No Eden or Elysia dependency.
- Runtime facts and compile-time contract are separate systems.
- Public API is small, explicit, object-based, and statically searchable.

## Canonical server API

\`\`\`ts
import { defineApp } from "lugas";
import { guard } from "lugas";

const app = defineApp({
  routes: {
    "/users/:id": {
      GET: route({
        params: z.object({ id: z.string() }),
        query: z.object({ verbose: z.boolean().optional() }),
        handler: ({ params, query }) => json(200, { id: params.id }),
      }),
    },
    "/admin": {
      GET: route({ before: [authGuard], handler: () => json(200, { ok: true }) }),
    },
  },
});
\`\`\`

## Canonical client API

\`\`\`ts
import { createClient } from "lugas/client";
import type { AppContract } from "lugas";

type API = AppContract<typeof app>;
const client = createClient<API>({ baseUrl: "http://localhost:3000" });

// Typed call with path restrictions and schema-derived input slots
const result = await client.get("/users/:id", {
  params: { id: "42" },
  query: { verbose: true },
});
// result.ok === true → result.data is { id: string } (schema output)
\`\`\`

## Guard pattern

\`\`\`ts
const authGuard = guard({
  name: "auth",
  handler: ({ request }) => {
    if (!request.headers.get("authorization")) {
      return json(401, { error: "unauthorized" });
    }
    return {}; // pass-through enrichment
  },
});
\`\`\`

## Diagnostic codes

Stable codes \`LUGAS_CLIENT_001\`–\`LUGAS_CLIENT_010\` for client errors,
\`LUGAS_APP_001\`–\`LUGAS_ROUTES_004\` for startup/config errors.
See docs/client-error-semantics.md.

## Key files

- docs/manifest-v1.md — frozen manifest schema
- docs/client-error-semantics.md — error/redaction policy
- docs/diagnostics.md — full diagnostic catalog
- examples/basic/, examples/validation/, examples/auth/, examples/client/
`;

if (process.argv.includes("--check")) {
  let current: string;
  try {
    current = readFileSync(OUTPUT, "utf8");
  } catch {
    console.error("llms.txt does not exist — run without --check to generate");
    process.exit(1);
  }
  const next = CONTENT;
  if (current !== next) {
    console.error("llms.txt is STALE — run 'bun run scripts/generate-llms.ts' to regenerate");
    process.exit(1);
  }
  console.log("llms.txt is up to date");
} else {
  writeFileSync(OUTPUT, CONTENT);
  console.log(`generated ${OUTPUT}`);
}
