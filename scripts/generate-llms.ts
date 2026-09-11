/**
 * Deterministic llms.txt generator (M4-014; hardened M10-001).
 *
 * Produces a machine-oriented index of the framework: purpose, canonical
 * API, key constraints, and documentation links. The doc-page inventory is
 * derived from docs/*.md on disk at generation time — the inventory cannot
 * silently drift from the shipped pages, and `--check` fails the gate when
 * it would.
 *
 * Usage: bun run scripts/generate-llms.ts [--check]
 *   --check  exits 1 if llms.txt is stale (enforced by `bun run verify` via
 *            scripts/verify.ts)
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const OUTPUT = resolve(ROOT, "llms.txt");
const DOCS_DIR = resolve(ROOT, "docs");

/** Governance/internal records that are not agent-facing guide pages. */
const NON_GUIDE_PAGES = new Set([
  "SOURCE-BASELINE.md",
  "THIRD_PARTY_NOTICES.md",
  "open-decisions.md",
  "security-test-matrix.md",
]);

/** One-line summaries for guide pages (order follows docs listing). */
const PAGE_SUMMARIES: Record<string, string> = {
  "getting-started.md": "install, first app, core walkthrough",
  "routing.md": "paths, methods, modules",
  "validation.md": "Standard Schema validation slots",
  "guards.md": "ordered guards, enrichment, short-circuit",
  "responses.md": "response helpers, RFC 9457 errors",
  "services.md": "services, init gate, shutdown",
  "client.md": "typed client, per-status results",
  "testing.md": "createTestServer, bound client",
  "examples.md": "runnable examples",
  "cors.md": "fail-closed CORS policy",
  "sse.md": "sse() streaming helper",
  "websockets.md": "websocket() routes, close-1001",
  "cookies.md": "cookie primitives, auth interop",
  "logging.md": "logging sink, request IDs",
  "openapi.md": "OpenAPI 3.1 + Scalar",
  "drizzle.md": "Drizzle service adapter",
  "uploads.md": "form() multipart uploads",
  "telemetry.md": "telemetry hooks, OTel recipe",
  "compression.md": "gzip/deflate, ETag/304",
  "rate-limit.md": "rateLimit() guard, app-owned store",
  "wire-honest-types.md": "Jsonify wire truth",
  "design-principles.md": "design constraints",
  "choosing-lugas.md": "framework comparison",
  "api-reference.md": "public API reference",
  "diagnostics.md": "the LUGAS_* diagnostic code catalog",
  "manifest-v1.md": "frozen static route manifest schema",
  "client-error-semantics.md": "client error/redaction policy",
  "compatibility.md": "supported platforms",
  "roadmap.md": "shipped surface, stop-rule",
  "ai-agents.md": "agent surfaces, LLM recipes",
  "body-limits.md": "body budget and server ceiling semantics",
  "performance-gates.md": "perf budgets",
  "evidence-guide.md": "release evidence",
  "beta-compatibility-policy.md": "pre-1.0 compatibility promises",
  "toolchain.md": "verified toolchain versions",
  "repository-layout.md": "repository layout map",
  "migrate-from-elysia.md": "from Elysia",
  "migrate-from-raw-bun.md": "from raw Bun",
  "agent-workflow.md": "repository agent operating standard",
  "cli-security.md": "CLI security posture",
};

function pageInventory(): string {
  const pages = readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md") && !NON_GUIDE_PAGES.has(f))
    .sort();
  const lines = pages.map((page) => {
    const summary = PAGE_SUMMARIES[page];
    return summary === undefined ? `- docs/${page}` : `- docs/${page} — ${summary}`;
  });
  return `## Documentation\n\n${lines.join("\n")}\n- examples/README.md — runnable example index`;
}

function buildContent(): string {
  return `# Lugas

A Bun-native HTTP framework with derived types, Standard Schema validation,
ordered guards, wire-honest JSON response types, and a typed client.

## Non-negotiable constraints

- No custom router — uses Bun's native route matching.
- No Eden or Elysia dependency.
- Runtime facts and compile-time contract are separate systems.
- Public API is small, explicit, object-based, and statically searchable.
- Zero production dependencies.

## Canonical server API

\`\`\`ts
import { defineApp } from "lugas";
import { route, json } from "lugas";

const app = defineApp({
  routes: {
    "/users/:id": {
      GET: route({ params: z.object({ id: z.string() }), handler: ({ params }) => json(200, { id: params.id }) }),
    },
  },
});
\`\`\`

## Canonical client API

\`\`\`ts
import { createClient } from "lugas/client";

const client = createClient<AppContract<typeof app>>({ baseUrl: "http://localhost:3000" });
const result = await client.get("/users/:id", { params: { id: "42" } });
// result.ok === true → result.data is { id: string } (schema output)
\`\`\`

## Guard pattern

\`\`\`ts
const authGuard = guard({
  name: "auth",
  handler: ({ request }) => (request.headers.get("authorization") ? {} : json(401, { error: "unauthorized" })),
});
\`\`\`

## Feature surface (shipped)

Standard Schema validation (Zod/Valibot); ordered guards with typed
enrichment; cookies (parseCookies/cookie); WebSockets (websocket()); secure
headers + health/ready; multipart uploads (form()); telemetry hooks;
compression/ETag (gzip/deflate, 304); rate limiting (rateLimit(), 429 +
Retry-After, application-owned store); CORS; SSE; structured logging;
OpenAPI 3.1 + Scalar; Drizzle adapter. Typed client outcome unions include
guard short-circuits (401/403, 429).

## Agent surfaces

- Machine-readable route surface: \`bunx lugas inspect ./app.ts\` (lugas-manifest-v1) or \`app.manifest\`.
- Tool-schema surface: enable \`defineApp({ openapi })\` and consume \`GET /openapi.json\` (OpenAPI 3.1, Standard JSON Schema when the validator exposes it).
- LLM token streaming: \`sse()\` routes forward model deltas; recipe in docs/ai-agents.md.
- Optional MCP adapter: proposed (ADR-0031), parked for 0.1.0 — integrate via openapi.json until accepted.

## Diagnostic codes

Stable codes \`LUGAS_CLIENT_001\`–\`LUGAS_CLIENT_010\` for client errors,
\`LUGAS_APP_001\`–\`LUGAS_ROUTES_004\` for startup/config errors,
\`LUGAS_RESPONSE_001\`–\`LUGAS_RESPONSE_005\` for typed response helpers, plus
per-feature codes (\`LUGAS_CORS_001\`–\`004\`, \`LUGAS_COOKIE_001\`–\`002\`,
\`LUGAS_WS_001\`–\`002\`, \`LUGAS_FORM_001\`, \`LUGAS_TELEMETRY_001\`,
\`LUGAS_COMPRESSION_001\`, \`LUGAS_ETAG_001\`, \`LUGAS_RATE_LIMIT_001\`, ...).
See docs/diagnostics.md.

${pageInventory()}
`;
}

if (process.argv.includes("--check")) {
  let current: string;
  try {
    current = readFileSync(OUTPUT, "utf8");
  } catch {
    console.error("llms.txt does not exist — run without --check to generate");
    process.exit(1);
  }
  const next = buildContent();
  if (current !== next) {
    console.error("llms.txt is STALE — run 'bun run scripts/generate-llms.ts' to regenerate");
    process.exit(1);
  }
  console.log("llms.txt is up to date");
} else {
  writeFileSync(OUTPUT, buildContent());
  console.log(`generated ${OUTPUT}`);
}
