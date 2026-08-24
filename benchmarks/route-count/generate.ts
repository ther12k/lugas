/**
 * Deterministic route-count fixture generator (M5-004).
 *
 * Generates identical route sets for raw Bun and Lugas at any scale.
 * Routes are semantically equivalent: same paths, same responses.
 *
 * Usage: bun run benchmarks/route-count/generate.ts <count> <output-dir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const count = Number(process.argv[2]) || 1000;
const outDir = resolve(import.meta.dir, "..", process.argv[3] || "generated");

// Lugas fixture
const lugasRoutes: string[] = [];
for (let i = 0; i < count; i++) {
  const method = ["GET", "POST", "PUT", "DELETE"][i % 4];
  lugasRoutes.push(`    "/route-${i}": { ${method}: route({ handler: () => new Response(JSON.stringify({ id: ${i} }), { headers: { "content-type": "application/json" } }) }) },`);
}

mkdirSync(resolve(outDir, "lugas"), { recursive: true });
writeFileSync(
  resolve(outDir, "lugas", `app-${count}.ts`),
  `import { defineApp } from "../../../src/core/app";\nimport { route } from "../../../src/core/route";\n\nexport default defineApp({\n  routes: {\n${lugasRoutes.join("\n")}\n  },\n});\n`,
);

console.log(`Generated ${count}-route fixtures in ${outDir}/`);
