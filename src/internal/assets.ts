/**
 * Opt-in public asset serving through the Bun adapter (ADR-0018, M7-001).
 *
 * Explicit file mappings and directory mounts under explicit URL prefixes,
 * compiled to native Bun route values. Assets never enter lugas-manifest-v1
 * route facts and bypass the Lugas request pipeline entirely — Bun serves
 * them natively (MIME detection, caching validators, range requests, native
 * 404 on misses). The public method contract is enforced by the mount shape:
 * GET-keyed method maps serve GET (+ implicit HEAD); every other method
 * falls through to the app's not-found policy. No 405 is promised.
 *
 * Ownership is fail-closed: any mutual pattern overlap between an asset
 * declaration and an API route (or another asset declaration) is rejected at
 * startup — never resolved by spread order or Bun match specificity.
 */
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { diagnostic } from "./diagnostics";
import { analyzePath, isDiagnostic } from "./path";

/** Exact URL path → filesystem file. Values resolve relative to process CWD when relative. */
export type AssetFileMappings = Readonly<Record<string, string | AssetFileMapping>>;
/**
 * Explicitly identified content-hashed asset mapping (ADR-0037): served as a
 * lazy file-backed pipeline handler carrying the given cache header, so the
 * immutable caching and the framework policies compose. Path semantics are
 * identical to the string form (exact URL path → filesystem file).
 */
export type AssetFileMapping = {
  readonly path: string;
  readonly cacheControl: string;
};
/** URL prefix ending in `/*` → filesystem directory (served as a native Bun directory route). */
export type AssetDirMounts = Readonly<Record<string, string>>;
export type AssetsConfig = {
  readonly files?: AssetFileMappings | undefined;
  readonly dirs?: AssetDirMounts | undefined;
};

/**
 * True when some concrete request path can match both path patterns.
 * Literals are patterns without `:param`/`*`; `*` is valid only as the final
 * segment and matches at least one further segment (Bun's `<prefix>/*` shape).
 */
export function patternsOverlap(a: string, b: string): boolean {
  const sa = a.split("/").slice(1);
  const sb = b.split("/").slice(1);
  let i = 0;
  let j = 0;
  while (i < sa.length && j < sb.length) {
    const x = sa[i]!;
    const y = sb[j]!;
    if (x === "*" || y === "*") return true;
    if (x === y || x.startsWith(":") || y.startsWith(":")) {
      i += 1;
      j += 1;
      continue;
    }
    return false;
  }
  return i === sa.length && j === sb.length;
}

function dirBase(mountKey: string): string {
  return mountKey.slice(0, -2); // strip the trailing "/*"
}

export function compileAssets(assets: AssetsConfig | undefined, apiPaths: ReadonlySet<string>): Record<string, unknown> {
  if (assets === undefined) return {};
  if (typeof assets !== "object" || assets === null || Array.isArray(assets)) {
    throw diagnostic("LUGAS_ASSET_001", "defineApp(): 'assets' must be an object", {
      hint: 'use assets: { files: { "/robots.txt": "./public/robots.txt" }, dirs: { "/assets/*": "./public/assets" } }',
    });
  }
  const unknownKeys = Object.keys(assets).filter((key) => key !== "files" && key !== "dirs");
  if (unknownKeys.length > 0) {
    throw diagnostic("LUGAS_ASSET_001", `defineApp(): unknown assets key '${unknownKeys[0]}'`, {
      hint: "allowed keys: files, dirs",
      context: { key: unknownKeys[0]! },
    });
  }
  const files = assets.files ?? {};
  const dirs = assets.dirs ?? {};
  for (const [mapName, map] of [["files", files], ["dirs", dirs]] as const) {
    if (typeof map !== "object" || map === null || Array.isArray(map)) {
      throw diagnostic("LUGAS_ASSET_001", `defineApp(): 'assets.${mapName}' must be an object keyed by URL path`, {
        context: { key: mapName },
      });
    }
    for (const [key, value] of Object.entries(map)) {
      if (mapName === "dirs") {
        if (typeof value !== "string" || value.length === 0) {
          throw diagnostic("LUGAS_ASSET_001", `defineApp(): assets.${mapName}['${key}'] must be a non-empty filesystem path`, {
            context: { key },
          });
        }
        continue;
      }
      if (typeof value === "string") {
        if (value.length === 0) {
          throw diagnostic("LUGAS_ASSET_001", `defineApp(): assets.${mapName}['${key}'] must be a non-empty filesystem path`, {
            context: { key },
          });
        }
        continue;
      }
      // Object form (ADR-0037): explicitly identified content-hashed asset.
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw diagnostic("LUGAS_ASSET_001", `defineApp(): assets.files['${key}'] must be a filesystem path string or { path, cacheControl }`, {
          hint: 'string form serves natively; { path, cacheControl } serves a file-backed pipeline handler for long-lived caching',
          context: { key },
        });
      }
      for (const field of ["path", "cacheControl"] as const) {
        if (typeof value[field] !== "string" || value[field].length === 0) {
          throw diagnostic("LUGAS_ASSET_001", `defineApp(): assets.files['${key}'].${field} must be a non-empty string`, {
            context: { key },
          });
        }
      }
    }
  }

  // File mappings: literal exact paths — no params, no wildcards.
  for (const key of Object.keys(files)) {
    const analysis = analyzePath(key);
    if (isDiagnostic(analysis) || analysis.paramNames.length > 0 || key.includes("*")) {
      throw diagnostic("LUGAS_ASSET_001", `defineApp(): assets.files key must be a literal exact path: '${key}'`, {
        hint: 'file mappings are exact paths like "/robots.txt"; use assets.dirs with a "/*" suffix for prefixes',
        context: { key },
      });
    }
  }
  // Dir mounts: native "<prefix>/*" shape; root catch-alls are out of scope.
  for (const key of Object.keys(dirs)) {
    if (!key.startsWith("/") || !key.endsWith("/*") || key === "/*") {
      throw diagnostic("LUGAS_ASSET_001", `defineApp(): assets.dirs key must be an explicit prefix ending in "/*": '${key}'`, {
        hint: 'e.g. "/assets/*"; root catch-alls are out of scope (ADR-0018)',
        context: { key },
      });
    }
    const analysis = analyzePath(key);
    if (isDiagnostic(analysis)) {
      throw diagnostic("LUGAS_ASSET_001", `defineApp(): invalid assets.dirs key '${key}': ${analysis.message}`, {
        context: { key },
      });
    }
  }

  // Explicit declarations point at real content.
  for (const [key, value] of Object.entries(files)) {
    const target = typeof value === "string" ? value : value.path;
    const abs = resolve(target);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      throw diagnostic("LUGAS_ASSET_003", `defineApp(): assets.files['${key}'] does not point at an existing file: '${target}'`, {
        context: { key, path: target },
      });
    }
  }
  for (const [key, value] of Object.entries(dirs)) {
    const abs = resolve(value);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) {
      throw diagnostic("LUGAS_ASSET_003", `defineApp(): assets.dirs['${key}'] does not point at an existing directory: '${value}'`, {
        context: { key, path: value },
      });
    }
  }

  // Native directory mounts require OS-level symlink containment (openat2 on Linux).
  // On non-Linux platforms (macOS, Windows), Bun's native directory routes follow
  // outside-root symlinks, exposing external files over HTTP (ADR-0018 amendment).
  // Fail closed before startup: reject nonempty assets.dirs on non-Linux platforms.
  const dirKeys = Object.keys(dirs);
  if (dirKeys.length > 0 && process.platform !== "linux") {
    throw diagnostic(
      "LUGAS_ASSET_004",
      `defineApp(): native directory mounts ('assets.dirs') are unsupported on platform '${process.platform}'`,
      {
        hint: "assets.dirs requires Linux with openat2(RESOLVE_IN_ROOT); use explicit assets.files on other platforms",
        context: { platform: process.platform, count: dirKeys.length },
      },
    );
  }

  // Fail-closed ownership: reject mutual pattern overlap with API routes or
  // other asset declarations. Bun's match specificity is never relied upon
  // to resolve API/asset ambiguity.
  const fileKeys = Object.keys(files);
  const mountKeys = Object.keys(dirs);
  const conflicts: Array<{ asset: string; other: string }> = [];
  for (const f of fileKeys) {
    for (const p of apiPaths) {
      if (patternsOverlap(f, p)) conflicts.push({ asset: `files['${f}']`, other: `route ${p}` });
    }
    for (const m of mountKeys) {
      if (patternsOverlap(f, m)) conflicts.push({ asset: `files['${f}']`, other: `dirs mount ${m}` });
    }
    for (const g of fileKeys) {
      if (g !== f && patternsOverlap(f, g)) conflicts.push({ asset: `files['${f}']`, other: `files['${g}']` });
    }
  }
  for (const m of mountKeys) {
    for (const p of apiPaths) {
      if (patternsOverlap(m, p)) conflicts.push({ asset: `dirs mount ${m}`, other: `route ${p}` });
    }
    for (const n of mountKeys) {
      if (n !== m && patternsOverlap(m, n)) conflicts.push({ asset: `dirs mount ${m}`, other: `dirs mount ${n}` });
    }
  }
  if (conflicts.length > 0) {
    const first = conflicts[0]!;
    throw diagnostic("LUGAS_ASSET_002", `defineApp(): ambiguous asset/API ownership: ${first.asset} overlaps ${first.other}`, {
      hint: "asset declarations and API routes must own disjoint paths (ADR-0018); change one of them",
      context: { asset: first.asset, other: first.other, conflicts: conflicts.length },
    });
  }

  // Native route values under GET-keyed method maps: GET (+ implicit HEAD)
  // serves; all other methods reach the app's not-found policy.
  // Object-form hashed mappings (ADR-0037) compile to file-backed pipeline
  // HANDLERS — lazy Bun.file responses carrying the configured cache header,
  // wrapped by the secure-headers/CORS passes like every other handler.
  const compiled: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(files)) {
    if (typeof value === "string") {
      compiled[key] = Object.freeze({ GET: Bun.file(resolve(value)) });
      continue;
    }
    const abs = resolve(value.path);
    const headers = { "cache-control": value.cacheControl };
    const handler = (): Response => new Response(Bun.file(abs), { headers });
    const headHandler = (): Response => new Response(null, { headers });
    compiled[key] = Object.freeze({ GET: handler, HEAD: headHandler });
  }
  for (const [key, value] of Object.entries(dirs)) {
    compiled[key] = Object.freeze({ GET: { dir: resolve(value) } });
  }
  return compiled;
}
