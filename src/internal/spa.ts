/**
 * Opt-in SPA hosting (ADR-0037, successor to ADR-0018's deferred decision).
 *
 * `spa: { shell, navigations }` mounts an explicitly SPA-owned set of URL
 * patterns that serve the built application shell as a policy-capable,
 * file-backed framework handler — security headers, CORS, and logging apply
 * to `/` and to every deep navigation identically (default cache policy:
 * revalidation, `cache-control: no-cache`).
 *
 * Ownership is application-declared and fail-closed: a navigation that
 * overlaps any declared route, asset mapping, asset directory prefix, health
 * endpoint, OpenAPI endpoint, or another navigation rejects at startup
 * (LUGAS_SPA_002). There is no catch-all and no reserved global prefix.
 * HEAD is mounted explicitly (headers, no body); every other method falls
 * through to the app's not-found policy — never a successful shell.
 *
 * Constraints honored (ADR-0037): no runtime build, no eager in-memory
 * loading of frontend files (lazy `Bun.file` responses), no request-path
 * filesystem scanner, no MIME implementation (Bun derives content types).
 */
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { diagnostic } from "./diagnostics";
import { isDiagnostic, analyzePath } from "./path";
import { patternsOverlap } from "./assets";

export type SpaConfig = {
  /** Filesystem path of the built application shell (e.g. `./dist/index.html`). Resolved relative to process CWD. */
  readonly shell: string;
  /** SPA-owned URL patterns: exact paths (`/app/projects/42`) or explicit prefixes ending in `/*` (`/app/*`). Root `/` is allowed. */
  readonly navigations: readonly string[];
};

const SPA_SHELL_CACHE = "no-cache";

export function compileSpa(
  spa: SpaConfig,
  owned: {
    routes: ReadonlySet<string>;
    assets: ReadonlySet<string>;
    health: ReadonlySet<string>;
    openapi: ReadonlySet<string>;
  },
): Record<string, unknown> {
  if (typeof spa !== "object" || spa === null || Array.isArray(spa)) {
    throw diagnostic("LUGAS_SPA_001", "defineApp(): 'spa' must be an object", {
      hint: 'use spa: { shell: "./dist/index.html", navigations: ["/", "/app/*"] }',
    });
  }
  const unknownKeys = Object.keys(spa).filter((key) => key !== "shell" && key !== "navigations");
  if (unknownKeys.length > 0) {
    throw diagnostic("LUGAS_SPA_001", `defineApp(): unknown spa key '${unknownKeys[0]}'`, {
      hint: "allowed keys: shell, navigations",
      context: { key: unknownKeys[0]! },
    });
  }
  if (typeof spa.shell !== "string" || spa.shell.length === 0) {
    throw diagnostic("LUGAS_SPA_001", "defineApp(): spa.shell must be a non-empty filesystem path", {
      hint: 'spa: { shell: "./dist/index.html", ... }',
    });
  }
  const shellAbs = resolve(spa.shell);
  if (!existsSync(shellAbs) || !statSync(shellAbs).isFile()) {
    throw diagnostic("LUGAS_SPA_001", `defineApp(): spa.shell does not point at an existing file: '${spa.shell}'`, {
      hint: "build the frontend before deployment; Lugas performs no runtime build (ADR-0037)",
      context: { path: spa.shell },
    });
  }
  if (!Array.isArray(spa.navigations) || spa.navigations.length === 0) {
    throw diagnostic("LUGAS_SPA_001", "defineApp(): spa.navigations must be a non-empty array of URL paths", {
      hint: 'e.g. navigations: ["/", "/app/*"] — exact paths or explicit prefixes ending in "/*"',
    });
  }
  for (const nav of spa.navigations) {
    if (typeof nav !== "string" || !nav.startsWith("/")) {
      throw diagnostic("LUGAS_SPA_001", `defineApp(): spa.navigations entry must be a URL path starting with '/': ${JSON.stringify(String(nav))}`, {
        context: { path: String(nav) },
      });
    }
    if (nav.includes(":")) {
      throw diagnostic("LUGAS_SPA_001", `defineApp(): spa.navigations entries are literals or "/*" prefixes — no parameters: '${nav}'`, {
        context: { path: nav },
      });
    }
    const analysis = analyzePath(nav);
    if (isDiagnostic(analysis)) {
      throw diagnostic("LUGAS_SPA_001", `defineApp(): invalid spa.navigations entry '${nav}': ${analysis.message}`, {
        context: { path: nav },
      });
    }
    const wildcard = nav.includes("*");
    if (wildcard && !nav.endsWith("/*")) {
      throw diagnostic("LUGAS_SPA_001", `defineApp(): spa.navigations wildcard must be a trailing "/*": '${nav}'`, {
        context: { path: nav },
      });
    }
  }

  // Fail-closed ownership: a navigation may not overlap any API route,
  // asset mapping/mount, health/openapi endpoint, or another navigation.
  const navs = [...new Set(spa.navigations)];
  const groups: Array<[ReadonlySet<string>, string]> = [
    [owned.routes, "route"],
    [owned.assets, "asset"],
    [owned.health, "health endpoint"],
    [owned.openapi, "openapi endpoint"],
  ];
  for (const nav of navs) {
    for (const [set, label] of groups) {
      for (const other of set) {
        if (patternsOverlap(nav, other)) {
          throw diagnostic("LUGAS_SPA_002", `defineApp(): SPA navigation '${nav}' overlaps ${label} '${other}'`, {
            hint: "navigations must own disjoint paths (ADR-0037); shrink the navigation or move the ownership",
            context: { navigation: nav, other },
          });
        }
      }
    }
    for (const other of navs) {
      if (other !== nav && patternsOverlap(nav, other)) {
        throw diagnostic("LUGAS_SPA_002", `defineApp(): SPA navigations '${nav}' and '${other}' overlap`, {
          hint: "each navigation must own disjoint paths (ADR-0037)",
          context: { navigation: nav, other },
        });
      }
    }
  }

  // Policy-capable shell handler: lazy file-backed response through the
  // pipeline. The cache policy is revalidation (no-cache); security headers,
  // CORS, and logging are applied by the caller's policy wraps.
  const cacheHeaders = { "cache-control": SPA_SHELL_CACHE };
  const shellHandler = (): Response => new Response(Bun.file(shellAbs), { headers: cacheHeaders });
  const shellHeadHandler = (): Response => new Response(null, { headers: cacheHeaders });

  const compiled: Record<string, unknown> = {};
  for (const nav of navs) {
    compiled[nav] = Object.freeze({ GET: shellHandler, HEAD: shellHeadHandler });
  }
  return compiled;
}
