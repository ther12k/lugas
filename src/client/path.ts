/**
 * Client-side path interpolation and encoding (M3-008).
 *
 * Builds a concrete request path from a route template (`/:name` segments and
 * an optional final `*` catch-all) plus caller-supplied parameters. Each
 * declared parameter is replaced exactly once and encoded per segment, so
 * reserved characters cannot inject additional path segments, queries, or
 * fragments. Validation errors are thrown before any fetch occurs.
 *
 * Grounding from live Bun 1.4.0 probes (recorded in M3-008 evidence):
 * - `:param` captures are percent-decoded by Bun, so Unicode round-trips;
 * - `%2F` stays within one matched segment (no cross-segment decoding);
 * - a wildcard matches the remainder including an empty `/prefix/`, but not
 *   the bare `/prefix`; dot segments are normalized before matching;
 * - the captured wildcard rest is not exposed via `req.params`.
 */

export type ClientPathParamValue = string | number | boolean;
export type ClientWildcardValue = string | readonly string[];
export type ClientPathParams = Record<string, ClientPathParamValue | ClientWildcardValue>;

export type ClientPathErrorCode =
  | "LUGAS_CLIENT_001"
  | "LUGAS_CLIENT_002"
  | "LUGAS_CLIENT_003"
  | "LUGAS_CLIENT_004"
  | "LUGAS_CLIENT_005";

/** Client path construction failure; thrown before any network dispatch. */
export class ClientPathError extends Error {
  readonly code: ClientPathErrorCode;

  constructor(code: ClientPathErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "ClientPathError";
    this.code = code;
  }
}

const PARAM_NAME = /^[A-Za-z0-9_]+$/;

type ParsedTemplate = {
  readonly names: readonly string[];
  readonly hasWildcard: boolean;
};

const templateCache = new Map<string, ParsedTemplate>();

/** Parses and validates a client route template; results are memoized. */
function parseTemplate(template: string): ParsedTemplate {
  const cached = templateCache.get(template);
  if (cached !== undefined) {
    return cached;
  }
  if (typeof template !== "string" || !template.startsWith("/")) {
    throw new ClientPathError(
      "LUGAS_CLIENT_005",
      `route template must start with '/': ${JSON.stringify(String(template))}`,
    );
  }
  const segments = template.slice(1).split("/");
  const names: string[] = [];
  let hasWildcard = false;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!;
    if (segment.startsWith(":")) {
      const name = segment.slice(1);
      if (!PARAM_NAME.test(name)) {
        throw new ClientPathError(
          "LUGAS_CLIENT_005",
          `invalid param token '${segment}' in template '${template}'`,
        );
      }
      if (names.includes(name)) {
        throw new ClientPathError(
          "LUGAS_CLIENT_004",
          `ambiguous duplicate param ':${name}' in template '${template}'`,
        );
      }
      names.push(name);
      continue;
    }
    if (segment === "*") {
      if (i !== segments.length - 1) {
        throw new ClientPathError(
          "LUGAS_CLIENT_005",
          `wildcard '*' must be the final segment in template '${template}'`,
        );
      }
      hasWildcard = true;
      continue;
    }
    if (segment.includes("*")) {
      throw new ClientPathError(
        "LUGAS_CLIENT_005",
        `malformed segment '${segment}' in template '${template}'`,
      );
    }
  }
  const parsed: ParsedTemplate = { names, hasWildcard };
  templateCache.set(template, parsed);
  return parsed;
}

function encodeSegments(value: string): string {
  return value.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

/**
 * Interpolates declared parameters into a route template exactly once per
 * declaration, encoding every supplied segment. Missing, extra, undefined,
 * ambiguous, and mistyped parameters are rejected before any fetch.
 */
export function interpolatePath(template: string, params?: ClientPathParams): string {
  const parsed = parseTemplate(template);
  if (params === undefined) {
    if (parsed.names.length > 0 || parsed.hasWildcard) {
      throw new ClientPathError(
        "LUGAS_CLIENT_001",
        `missing path parameter${parsed.hasWildcard ? "s" : ""} ${describeDeclared(parsed)} for '${template}'`,
      );
    }
    return template;
  }
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    throw new ClientPathError("LUGAS_CLIENT_003", "params must be an object");
  }
  for (const key of Object.keys(params)) {
    const declared = parsed.names.includes(key) || (key === "*" && parsed.hasWildcard);
    if (!declared) {
      throw new ClientPathError(
        "LUGAS_CLIENT_002",
        `unexpected path parameter ':${key}' is not declared by '${template}'`,
      );
    }
  }
  const source = template.slice(1).split("/");
  const parts: string[] = [];
  for (const segment of source) {
    if (!segment.startsWith(":") && segment !== "*") {
      parts.push(segment);
      continue;
    }
    const key = segment === "*" ? "*" : segment.slice(1);
    if (!(key in params) || params[key] === undefined || params[key] === null) {
      throw new ClientPathError(
        "LUGAS_CLIENT_001",
        `missing path parameter ':${key}' for '${template}'`,
      );
    }
    const value = params[key];
    if (segment === "*") {
      if (typeof value === "string") {
        parts.push(encodeSegments(value));
        continue;
      }
      if (Array.isArray(value)) {
        for (const element of value) {
          if (typeof element !== "string" || element === "") {
            throw new ClientPathError(
              "LUGAS_CLIENT_003",
              `invalid wildcard segment ${JSON.stringify(String(element))} for '*': elements must be non-empty strings`,
            );
          }
        }
        parts.push(value.map((element) => encodeURIComponent(element)).join("/"));
        continue;
      }
      throw new ClientPathError(
        "LUGAS_CLIENT_003",
        `invalid wildcard value for '*' in '${template}': expected string or array of strings`,
      );
    }
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new ClientPathError(
        "LUGAS_CLIENT_003",
        `invalid value for ':${key}' in '${template}': expected string, number, or boolean`,
      );
    }
    parts.push(encodeURIComponent(String(value)));
  }
  return `/${parts.join("/")}`;
}

function describeDeclared(parsed: ParsedTemplate): string {
  const described = parsed.names.map((name) => `':${name}'`);
  if (parsed.hasWildcard) {
    described.push("'*'");
  }
  return described.join(", ");
}
