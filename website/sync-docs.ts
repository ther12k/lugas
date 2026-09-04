/**
 * Deterministic docs sync for the Starlight site (docs restructure, M6D1).
 *
 * `docs/` remains the canonical home of user documentation; this script
 * copies curated pages into the Starlight content directory with site
 * frontmatter and rewritten links, so the site can never drift from the
 * repository. Runs before every build (`bun run build`) and in CI.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";
const ROOT = resolve(import.meta.dir, "..");
const OUT = join(import.meta.dir, "src", "content", "docs");
const SITE_BASE = "/lugas";
const REPO_BLOB = "https://github.com/ther12k/lugas/blob/main";
const REPO_TREE = "https://github.com/ther12k/lugas/tree/main";

interface PageSpec {
  /** Repo-relative source path. */
  source: string;
  slug: string;
  title: string;
  description: string;
}

const PAGES: PageSpec[] = [
  { source: "docs/getting-started.md", slug: "getting-started", title: "Getting started", description: "Install Lugas and build your first typed Bun API." },
  { source: "docs/examples.md", slug: "examples", title: "Examples", description: "Runnable single-concept example applications." },
  { source: "docs/wire-honest-types.md", slug: "wire-honest-types", title: "Wire-honest types", description: "How Lugas response types model JSON serialization truth." },
  { source: "docs/design-principles.md", slug: "design-principles", title: "Design principles", description: "Explicit HTTP, no code generation, no proxies, zero forced ecosystem." },
  { source: "docs/choosing-lugas.md", slug: "choosing-lugas", title: "Choosing Lugas", description: "Where Lugas fits among raw Bun, Elysia, Hono, Fastify, and tRPC." },
  { source: "docs/api-reference.md", slug: "api-reference", title: "API reference", description: "Public API reference." },
  { source: "docs/diagnostics.md", slug: "diagnostics", title: "Diagnostics", description: "The LUGAS_* diagnostic code catalog." },
  { source: "docs/manifest-v1.md", slug: "manifest-v1", title: "lugas-manifest-v1", description: "The frozen static route manifest schema." },
  { source: "docs/client-error-semantics.md", slug: "client-error-semantics", title: "Client error semantics", description: "Client error and redaction policy." },
  { source: "docs/compatibility.md", slug: "compatibility", title: "Compatibility", description: "Supported Bun, TypeScript, validator, and platform combinations." },
  { source: "docs/roadmap.md", slug: "roadmap", title: "Roadmap", description: "Shipped beta surface and planned first-party batteries." },
];

const SITE_SLUGS = new Map(PAGES.map((page) => [page.source, page.slug]));

/** Strip a leading YAML frontmatter block, if present. */
function stripFrontmatter(content: string): string {
  if (!content.startsWith("---\n")) return content;
  const close = content.indexOf("\n---\n", 4);
  if (close === -1) return content;
  return content.slice(close + 5);
}

/** Resolve a Markdown link target relative to the source doc's repo directory. */
function resolveRepoPath(sourceDoc: string, target: string): string {
  const baseDir = dirname(join("/", sourceDoc));
  return normalize(join(baseDir, target)).replace(/^\//, "").replace(/\\/g, "/");
}

/** Rewrite repo-relative links: synced pages become site routes, everything else points at GitHub. */
function rewriteLinks(body: string, sourceDoc: string): string {
  return body.replace(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (full, rawTarget: string) => {
    const target = rawTarget.trim();
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target) || target.startsWith("#") || target.startsWith("/")) {
      return full;
    }
    const [pathPart, ...fragments] = target.split("#");
    const fragment = fragments.length > 0 ? `#${fragments.join("#")}` : "";
    if (pathPart === undefined || pathPart === "") return full;
    const resolved = resolveRepoPath(sourceDoc, pathPart);
    const slug = SITE_SLUGS.get(resolved);
    if (slug !== undefined) return `](${SITE_BASE}/${slug}/${fragment})`;
    if (resolved.endsWith(".md")) return `](${REPO_BLOB}/${resolved}${fragment})`;
    return `](${REPO_TREE}/${resolved})`;
  });
}

// Remove only this script's own outputs so committed pages (index.md) survive.
mkdirSync(OUT, { recursive: true });
for (const page of PAGES) {
  rmSync(join(OUT, `${page.slug}.md`), { force: true });
}

for (const page of PAGES) {
  const source = join(ROOT, page.source);
  const body = rewriteLinks(stripFrontmatter(readFileSync(source, "utf8")).trimEnd(), page.source);
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(page.title)}`,
    `description: ${JSON.stringify(page.description)}`,
    "---",
    "",
  ].join("\n");
  writeFileSync(join(OUT, `${page.slug}.md`), `${frontmatter}${body}\n`);
}

cpSync(join(ROOT, "docs", "assets", "lugas-logo.svg"), join(import.meta.dir, "public", "lugas-logo.svg"));

console.log(`synced ${PAGES.length} docs pages into ${OUT}`);
