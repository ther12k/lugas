import { defineApp } from "../../src/core/app";
import { join } from "node:path";
import { route } from "../../src/core/route";
import { json } from "../../src/core/response";

const PUB = join(import.meta.dir, "public");

/**
 * Opt-in public asset serving (ADR-0018): explicit file mappings plus a
 * directory mount under an explicit prefix, served natively by Bun.
 */
export const app = defineApp({
  routes: {
    "/api/ping": {
      GET: route({ handler: () => json(200, { pong: true, at: new Date().toISOString() }) }),
    },
    "/api/missing": {
      GET: route({ handler: () => json(404, { error: "no such API route" }) }),
    },
  },
  assets: {
    files: {
      "/index.html": join(PUB, "index.html"),
    },
    dirs: {
      "/assets/*": join(PUB, "assets"),
    },
  },
  notFound: () => json(404, { error: "not found" }),
});

export default app;
