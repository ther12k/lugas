/**
 * Compression and ETag response policies (M9-007, ADR-0033).
 *
 * Two opt-in app-level response transforms over the pipeline, sharing the
 * secureHeaders pass pattern: `compression` negotiates gzip/deflate through
 * Accept-Encoding (native Bun codecs only — no brotli, no dependencies)
 * with structural skips (SSE must never be buffered; pre-encoded, ranged,
 * tiny, and non-compressible responses pass through untouched) and
 * `Vary: Accept-Encoding` on every compressible response; `etag` computes
 * strong-by-default SHA-1 validators over the UNCOMPRESSED body and answers
 * matching If-None-Match with a 304 short-circuit. Etag evaluates before
 * compression: the validator is encoding-independent and a 304 never pays
 * the encode cost.
 */
import { diagnostic } from "./diagnostics";

export type CompressionEncoding = "gzip" | "deflate";

export type CompressionConfig =
  | true
  | {
      /** Subset/ordering of supported encodings; default ["gzip", "deflate"]. */
      readonly encodings?: ReadonlyArray<CompressionEncoding>;
      /** Bodies at or below this byte length pass through; default 1024. */
      readonly minSize?: number;
      /** Exact content types eligible; default: the standard compressible set. */
      readonly types?: ReadonlyArray<string>;
    };

export type CompiledCompression = {
  readonly encodings: ReadonlyArray<CompressionEncoding>;
  readonly minSize: number;
  readonly types: ReadonlySet<string>;
};

const DEFAULT_ENCODINGS: ReadonlyArray<CompressionEncoding> = ["gzip", "deflate"];
const DEFAULT_MIN_SIZE = 1024;
const DEFAULT_TYPES: ReadonlyArray<string> = [
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "text/xml",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/javascript",
  "application/xml",
  "application/rss+xml",
  "application/atom+xml",
  "image/svg+xml",
];

function isCompressibleType(contentType: string, types: ReadonlySet<string>): boolean {
  const mediaType = contentType.split(";")[0]!.trim().toLowerCase();
  if (types.has(mediaType)) return true;
  return mediaType.startsWith("text/") || (mediaType.startsWith("application/") && mediaType.endsWith("+json"));
}

export function compileCompression(config: CompressionConfig): CompiledCompression {
  if (config === true) {
    return { encodings: DEFAULT_ENCODINGS, minSize: DEFAULT_MIN_SIZE, types: new Set(DEFAULT_TYPES) };
  }
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_COMPRESSION_001", "defineApp(): invalid compression configuration", {
      hint: "pass compression: true or { encodings?, minSize?, types? }",
    });
  }
  let encodings: ReadonlyArray<CompressionEncoding> = DEFAULT_ENCODINGS;
  if (config.encodings !== undefined) {
    if (!Array.isArray(config.encodings) || config.encodings.length === 0) {
      throw diagnostic("LUGAS_COMPRESSION_001", "defineApp(): compression.encodings must be a non-empty array", {
        hint: 'supported encodings: "gzip", "deflate"',
        context: { key: "encodings" },
      });
    }
    for (const e of config.encodings) {
      if (e !== "gzip" && e !== "deflate") {
        throw diagnostic("LUGAS_COMPRESSION_001", `defineApp(): unsupported compression encoding '${String(e)}'`, {
          hint: 'native codecs only: "gzip", "deflate" (no brotli — it would need a dependency)',
          context: { key: "encodings" },
        });
      }
    }
    encodings = [...config.encodings];
  }
  let minSize = DEFAULT_MIN_SIZE;
  if (config.minSize !== undefined) {
    if (typeof config.minSize !== "number" || !Number.isInteger(config.minSize) || config.minSize < 0) {
      throw diagnostic("LUGAS_COMPRESSION_001", "defineApp(): compression.minSize must be a non-negative integer", {
        hint: "bodies at or below minSize pass through uncompressed; default 1024",
        context: { key: "minSize" },
      });
    }
    minSize = config.minSize;
  }
  let types: ReadonlyArray<string> = DEFAULT_TYPES;
  if (config.types !== undefined) {
    if (!Array.isArray(config.types) || config.types.length === 0 || config.types.some((t) => typeof t !== "string" || t.trim() === "")) {
      throw diagnostic("LUGAS_COMPRESSION_001", "defineApp(): compression.types must be a non-empty array of content-type strings", {
        hint: "exact media types (parameters ignored), e.g. application/json; text/* and application/*+json always match",
        context: { key: "types" },
      });
    }
    types = config.types.map((t) => t.toLowerCase());
  }
  return { encodings, minSize, types: new Set(types) };
}

/** One negotiated Accept-Encoding candidate. */
type EncodingPreference = { readonly encoding: CompressionEncoding; readonly q: number };

function parseAcceptEncoding(header: string | null): ReadonlyArray<EncodingPreference> {
  if (header === null) return [];
  const out: EncodingPreference[] = [];
  for (const part of header.split(",")) {
    const [token, ...params] = part.split(";");
    const name = token!.trim().toLowerCase();
    if (name !== "gzip" && name !== "deflate" && name !== "*" && name !== "identity") continue;
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key === "q") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) q = parsed;
      }
    }
    if (name === "gzip" || name === "deflate") out.push({ encoding: name, q });
  }
  return out.filter((p) => p.q > 0).sort((a, b) => b.q - a.q);
}

const BODYLESS_STATUSES = new Set([204, 205, 304]);

function encode(encoding: CompressionEncoding, bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  // Bun's gzip/deflate return a fresh buffer over a plain ArrayBuffer; the
  // default ArrayBufferLike type is wider than the runtime fact, and DOM-lib
  // consumers need the exact view for BodyInit (CA-11 consumer truth).
  return (encoding === "gzip" ? Bun.gzipSync(bytes) : Bun.deflateSync(bytes)) as Uint8Array<ArrayBuffer>;
}

/**
 * Applies the compression policy to one pipeline response. Fail-open: any
 * skip rule or a body that cannot be buffered leaves the response untouched.
 */
export async function applyCompression(
  compiled: CompiledCompression,
  request: Request,
  response: Response,
): Promise<Response> {
  if (BODYLESS_STATUSES.has(response.status)) return response;
  if (response.headers.has("content-encoding")) return response;
  const contentType = response.headers.get("content-type");
  if (contentType === null) return response;
  const mediaType = contentType.split(";")[0]!.trim().toLowerCase();
  if (mediaType === "text/event-stream") return response; // SSE must not be buffered
  if (!isCompressibleType(contentType, compiled.types)) return response;
  if (response.headers.has("content-range")) return response;

  // Vary always applies to compressible responses: the encoding variant
  // depends on the request header whether or not this response compressed.
  const headers = new Headers(response.headers);
  headers.append("vary", "Accept-Encoding");

  if (response.body === null) {
    return new Response(null, { status: response.status, statusText: response.statusText, headers });
  }
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch {
    return response; // unbufferable body — pass through untouched
  }
  if (bytes.byteLength <= compiled.minSize) {
    return new Response(bytes, { status: response.status, statusText: response.statusText, headers });
  }

  const preferences = parseAcceptEncoding(request.headers.get("accept-encoding"));
  const chosen = preferences.find((p) => compiled.encodings.includes(p.encoding));
  if (chosen === undefined) {
    return new Response(bytes, { status: response.status, statusText: response.statusText, headers });
  }
  headers.set("content-encoding", chosen.encoding);
  const encoded = encode(chosen.encoding, bytes);
  return new Response(encoded, { status: response.status, statusText: response.statusText, headers });
}

export type EtagConfig = true | { readonly weak?: boolean };

export type CompiledEtag = { readonly weak: boolean };

export function compileEtag(config: EtagConfig): CompiledEtag {
  if (config === true) return { weak: false };
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_ETAG_001", "defineApp(): invalid etag configuration", {
      hint: "pass etag: true or { weak?: boolean }",
    });
  }
  if (config.weak !== undefined && typeof config.weak !== "boolean") {
    throw diagnostic("LUGAS_ETAG_001", "defineApp(): etag.weak must be a boolean", {
      hint: "strong validators are the default; weak (W/\"…\") is opt-in",
      context: { key: "weak" },
    });
  }
  return { weak: config.weak === true };
}

/** RFC 9110 If-None-Match match: quoted tokens, comma lists, `*`. */
function ifNoneMatchMatches(header: string | null, etag: string): boolean {
  if (header === null) return false;
  const trimmed = header.trim();
  if (trimmed === "*") return true;
  return trimmed.split(",").some((candidate) => {
    let token = candidate.trim();
    if (token.startsWith("W/")) token = token.slice(2);
    return token === etag || token === "*";
  });
}

/**
 * Applies the etag policy: computes a strong (or configured-weak) validator
 * over the uncompressed body of GET/HEAD responses and short-circuits a
 * matching If-None-Match with 304. Bodies are buffered once — the same cost
 * compression would pay — and skipped responses pass through untouched.
 */
export async function applyEtag(
  compiled: CompiledEtag,
  request: Request,
  response: Response,
): Promise<Response> {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return response;
  if (BODYLESS_STATUSES.has(response.status)) return response;
  if (response.headers.has("etag")) return response; // application validator wins
  if (response.body === null) return response;

  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = new Uint8Array(await response.arrayBuffer());
  } catch {
    return response;
  }
  const hasher = new Bun.CryptoHasher("sha1");
  hasher.update(bytes);
  const etag = `${compiled.weak ? 'W/' : ''}"${hasher.digest("hex")}"`;

  if (ifNoneMatchMatches(request.headers.get("if-none-match"), etag)) {
    const headers = new Headers();
    headers.set("etag", etag);
    return new Response(null, { status: 304, headers });
  }
  const headers = new Headers(response.headers);
  headers.set("etag", etag);
  return new Response(bytes, { status: response.status, statusText: response.statusText, headers });
}
