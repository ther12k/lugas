/**
 * `form()` — bounded multipart body descriptor (M9-005, ADR-0030).
 *
 * Presence in a route's `body` slot opts the route into bounded
 * `multipart/form-data` parsing: the raw body is read stream-wise up to the
 * effective body budget (ADR-0019), refused at the cap, and the buffered
 * bytes are parsed by the platform's `FormData` implementation — Lugas ships
 * no MIME parser. Handlers receive `{ fields, files }` with native `File`
 * values; repeated part names collapse last-wins (documented; the native
 * `request.formData()` remains the multiplicity escape hatch).
 */
import { diagnostic } from "../internal/diagnostics";

export type FormConfig = {
  /** Maximum number of text fields; exceeding parts reject with `413 FORM_LIMIT_EXCEEDED`. Default 64. */
  readonly maxFields?: number;
  /** Maximum number of file parts. Default 16. */
  readonly maxFiles?: number;
  /** Maximum size of a single file part in bytes. Default 10 MiB. */
  readonly maxFileSize?: number;
};

export type MultipartBody = {
  /** Text parts, last-wins on repeated names. */
  readonly fields: Record<string, string>;
  /** File parts as native `File` values, keyed by part name, last-wins. */
  readonly files: Record<string, File>;
};

const DEFAULT_MAX_FIELDS = 64;
const DEFAULT_MAX_FILES = 16;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

const formMarker = Symbol("lugas.formDescriptor");

export type FormDescriptor = {
  readonly [formMarker]: true;
  readonly maxFields: number;
  readonly maxFiles: number;
  readonly maxFileSize: number;
};

function positiveInteger(value: unknown, key: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw diagnostic("LUGAS_FORM_001", `form(): '${key}' must be a positive integer`, {
      hint: `form(${JSON.stringify({ [key]: 10 })}) — limits are positive integers (bytes for maxFileSize)`,
      context: { key },
    });
  }
  return value;
}

export function form(config: FormConfig = {}): FormDescriptor {
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_FORM_001", "form(): config must be an object", {
      hint: "pass form() or form({ maxFields, maxFiles, maxFileSize })",
    });
  }
  const known = new Set(["maxFields", "maxFiles", "maxFileSize"]);
  for (const key of Object.keys(config)) {
    if (!known.has(key)) {
      throw diagnostic("LUGAS_FORM_001", `form(): unknown config key '${key}'`, {
        hint: "allowed keys: maxFields, maxFiles, maxFileSize",
        context: { key },
      });
    }
  }
  return Object.freeze({
    [formMarker]: true as const,
    maxFields: config.maxFields !== undefined ? positiveInteger(config.maxFields, "maxFields") : DEFAULT_MAX_FIELDS,
    maxFiles: config.maxFiles !== undefined ? positiveInteger(config.maxFiles, "maxFiles") : DEFAULT_MAX_FILES,
    maxFileSize: config.maxFileSize !== undefined ? positiveInteger(config.maxFileSize, "maxFileSize") : DEFAULT_MAX_FILE_SIZE,
  }) as FormDescriptor;
}

/** Compile-time/pipeline detection: is this body slot a multipart codec? */
export function isFormDescriptor(value: unknown): value is FormDescriptor {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { [formMarker]?: unknown })[formMarker] === true
  );
}
