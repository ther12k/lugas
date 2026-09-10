/**
 * RFC 6265 cookie primitives (M9-002, ADR-0027).
 *
 * Two pure functions, no pipeline, no config surface: a lenient reader for
 * the `Cookie` request header (hostile input is skipped, never thrown) and a
 * strict, fail-closed writer for `Set-Cookie` header entries (invalid names,
 * values, or attribute combinations throw stable diagnostics at call time,
 * before anything malformed can reach the wire). The asymmetry is the
 * contract: reads are lenient because input is hostile; writes are strict
 * because output is a contract.
 *
 * No signing, no session store, no identity: those are application recipes
 * (docs/cookies.md) per the ODR-0010 standing non-goals.
 */
import { diagnostic } from "../internal/diagnostics";

/** `Set-Cookie` attributes accepted by `cookie()`. All optional; `sameSite: "none"` requires `secure: true`. */
export type CookieAttrs = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  path?: string;
  domain?: string;
  /** Lifetime in seconds; a non-positive value expires the cookie immediately. */
  maxAge?: number;
  /** Absolute expiry; `maxAge` is preferred (RFC 6265bis §5.2.1). */
  expires?: Date;
  partitioned?: boolean;
};

/**
 * Cookie-name grammar, RFC 6265 §4.1.1 token: US-ASCII excluding controls,
 * separators, and `";"`/`"="`. Non-ASCII names are rejected rather than
 * silently mangled (servers SHOULD encode names as ASCII).
 */
const NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/**
 * Cookie-value grammar, RFC 6265 §4.1.1 cookie-value: optionally double-
 * quoted, excluding whitespace, DQUOTE, comma, semicolon, and backslash.
 * (6265bis additionally excludes controls; the ASCII-only check enforces
 * that conservatively for both quoted and unquoted forms.)
 */
const VALUE_RE = /^[\x21\x23\x24\x26\x27\x2A\x2B\x2D\x2E\x30-\x39\x3A\x3C-\x5B\x5D-\x7E]*$/;
const QUOTED_VALUE_RE = /^"[\x21\x23\x24\x26\x27\x2A\x2B\x2D\x2E\x30-\x39\x3A\x3C-\x5B\x5D-\x7E]*"$/;

/**
 * Parses the request's `Cookie` header per RFC 6265 §5.4 into a plain map.
 * Lenient by design: malformed pairs (`"=v"`, `";;"`, empty segments) are
 * skipped; duplicated names collapse last-wins per sender rules; a request
 * without a `Cookie` header yields `{}`. Values are returned as parsed
 * (quotes preserved when the sender quoted them) — interpretation stays
 * application-owned.
 */
export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie");
  if (header === null) return {};
  const cookies: Record<string, string> = {};
  // §5.4's splitting algorithm: semicolons separate pairs; a leading `$`
  // marks reserved content this parser does not interpret.
  for (const pair of header.split(";")) {
    const eq = pair.indexOf("=");
    let name: string;
    let value: string;
    if (eq === -1) {
      name = pair.trim();
      value = "";
    } else {
      name = pair.slice(0, eq).trim();
      value = pair.slice(eq + 1).trim();
    }
    if (name === "" || name.startsWith("$")) continue;
    cookies[name] = value;
  }
  return cookies;
}

/**
 * Serializes one `Set-Cookie` header entry. The returned string is meant for
 * `init.headers` of the typed response helpers — `Headers` semantics accept
 * arrays of `[name, value]` pairs, which preserves multiple `Set-Cookie`
 * headers per response:
 *
 * ```ts
 * json(200, data, { headers: [["set-cookie", cookie("session", token, { httpOnly: true })]] })
 * ```
 *
 * Fails closed with `LUGAS_COOKIE_001` (invalid name/value token) and
 * `LUGAS_COOKIE_002` (invalid attribute combination: `sameSite: "none"`
 * without `secure: true`, non-string path/domain, non-integer or non-finite
 * maxAge, or an invalid expires Date).
 */
export function cookie(name: string, value: string, attrs: CookieAttrs = {}): string {
  if (typeof name !== "string" || !NAME_RE.test(name)) {
    throw diagnostic("LUGAS_COOKIE_001", `cookie(): invalid cookie name ${JSON.stringify(String(name))}`, {
      hint: "names are RFC 6265 tokens: US-ASCII letters, digits, and !#$%&'*+-.^_`|~",
      context: { name: typeof name === "string" && name.length <= 64 ? name : "" },
    });
  }
  if (typeof value !== "string" || !(VALUE_RE.test(value) || QUOTED_VALUE_RE.test(value))) {
    throw diagnostic("LUGAS_COOKIE_001", `cookie(): invalid cookie value for name '${name}'`, {
      hint: 'values exclude whitespace, DQUOTE, comma, semicolon, and backslash; encode other characters (e.g. encodeURIComponent)',
      context: { name: name.slice(0, 64) },
    });
  }
  if (typeof attrs !== "object" || attrs === null) {
    throw diagnostic("LUGAS_COOKIE_002", `cookie(): attributes must be an object for name '${name}'`, {
      hint: "pass cookie(name, value, { httpOnly, secure, sameSite, path, domain, maxAge, expires, partitioned }) or omit the argument",
      context: { name: name.slice(0, 64) },
    });
  }
  if (attrs.sameSite !== undefined && attrs.sameSite !== "strict" && attrs.sameSite !== "lax" && attrs.sameSite !== "none") {
    throw diagnostic("LUGAS_COOKIE_002", `cookie(): invalid sameSite '${String(attrs.sameSite)}' for name '${name}'`, {
      hint: 'sameSite is "strict", "lax", or "none"',
      context: { name: name.slice(0, 64) },
    });
  }
  if (attrs.sameSite === "none" && attrs.secure !== true) {
    throw diagnostic("LUGAS_COOKIE_002", `cookie(): sameSite 'none' requires secure for name '${name}'`, {
      hint: "browsers reject SameSite=None without Secure; add secure: true or choose lax/strict",
      context: { name: name.slice(0, 64) },
    });
  }
  if (attrs.path !== undefined && (typeof attrs.path !== "string" || attrs.path === "")) {
    throw diagnostic("LUGAS_COOKIE_002", `cookie(): invalid path for name '${name}'`, {
      hint: "path is a non-empty URI path string",
      context: { name: name.slice(0, 64) },
    });
  }
  if (attrs.domain !== undefined && (typeof attrs.domain !== "string" || attrs.domain === "")) {
    throw diagnostic("LUGAS_COOKIE_002", `cookie(): invalid domain for name '${name}'`, {
      hint: "domain is a non-empty host string",
      context: { name: name.slice(0, 64) },
    });
  }
  if (attrs.maxAge !== undefined && (typeof attrs.maxAge !== "number" || !Number.isInteger(attrs.maxAge) || !Number.isFinite(attrs.maxAge))) {
    throw diagnostic("LUGAS_COOKIE_002", `cookie(): invalid maxAge for name '${name}'`, {
      hint: "maxAge is an integer number of seconds (negative values expire the cookie)",
      context: { name: name.slice(0, 64) },
    });
  }
  if (attrs.expires !== undefined && !(attrs.expires instanceof Date && !Number.isNaN(attrs.expires.getTime()))) {
    throw diagnostic("LUGAS_COOKIE_002", `cookie(): invalid expires for name '${name}'`, {
      hint: "expires is a valid Date; prefer maxAge",
      context: { name: name.slice(0, 64) },
    });
  }

  let out = `${name}=${value}`;
  if (attrs.maxAge !== undefined) out += `; Max-Age=${attrs.maxAge}`;
  if (attrs.expires !== undefined) out += `; Expires=${attrs.expires.toUTCString()}`;
  if (attrs.domain !== undefined) out += `; Domain=${attrs.domain}`;
  if (attrs.path !== undefined) out += `; Path=${attrs.path}`;
  if (attrs.secure === true) out += "; Secure";
  if (attrs.httpOnly === true) out += "; HttpOnly";
  if (attrs.sameSite !== undefined) out += `; SameSite=${attrs.sameSite === "strict" ? "Strict" : attrs.sameSite === "lax" ? "Lax" : "None"}`;
  if (attrs.partitioned === true) out += "; Partitioned";
  return out;
}
