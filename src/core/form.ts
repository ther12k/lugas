/**
 * `form()` — bounded multipart body descriptor (M9-005, ADR-0030).
 *
 * Presence in a route's `body` slot opts the route into bounded
 * `multipart/form-data` parsing: the raw body is read stream-wise up to the
 * effective body budget (ADR-0019), refused at the cap, and the buffered
 * bytes are parsed by the platform's `FormData` implementation — Lugas ships
 * no MIME parser. Handlers receive `{ fields, files }` with native `File`
 * values. Repeated part names collapse last-wins by default (mirroring
 * `parseCookies`); `form({ repeated: "preserve" })` additionally exposes
 * every part per name under `groups` — the default is never changed
 * silently. The native `request.formData()` remains the multiplicity escape
 * hatch.
 *
 * The client side of the codec lives in `lugas/client` (`formBody()`): the
 * wrapper is the runtime discriminator that selects the multipart encoder
 * (the route contract is compile-time only and is erased before dispatch).
 * Its type — `FormBodyInput` — is declared here so the contract can require
 * it for form-body routes.
 */
import { diagnostic } from "../internal/diagnostics";

/** How repeated part names are exposed to the handler. */
export type FormRepeated = "last-wins" | "preserve";

export type FormConfig = {
  /** Maximum number of text fields; exceeding parts reject with `413 FORM_LIMIT_EXCEEDED`. Default 64. */
  readonly maxFields?: number;
  /** Maximum number of file parts. Default 16. */
  readonly maxFiles?: number;
  /** Maximum size of a single file part in bytes. Default 10 MiB. */
  readonly maxFileSize?: number;
  /**
   * Multiplicity mode for repeated part names (RF-3 roadmap follow-up).
   * `"last-wins"` (default) keeps the M9-005 contract: `fields`/`files`
   * collapse repeats. `"preserve"` additionally exposes every part per name
   * under `groups` — `fields`/`files` stay last-wins in both modes.
   */
  readonly repeated?: FormRepeated;
};

export type MultipartBody = {
  /** Text parts, last-wins on repeated names. */
  readonly fields: Record<string, string>;
  /** File parts as native `File` values, keyed by part name, last-wins. */
  readonly files: Record<string, File>;
};

/** Every part per name, in wire order — present only in `repeated: "preserve"` mode. */
export type MultipartBodyGroups = { readonly [name: string]: ReadonlyArray<string | File> };

/** Handler body view for `form({ repeated: "preserve" })` routes. */
export type MultipartBodyPreserved = MultipartBody & { readonly groups: MultipartBodyGroups };

const DEFAULT_MAX_FIELDS = 64;
const DEFAULT_MAX_FILES = 16;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

const formMarker = Symbol("lugas.formDescriptor");

export type FormDescriptor<TRepeated extends FormRepeated = "last-wins"> = {
  readonly [formMarker]: true;
  readonly maxFields: number;
  readonly maxFiles: number;
  readonly maxFileSize: number;
  readonly repeated: TRepeated;
};

/** Any `form()` descriptor regardless of multiplicity mode (contract matching). */
export type AnyFormDescriptor = { readonly [formMarker]: true };

/** One client-side multipart field value. Native `File`/`Blob` values are preserved as parts. */
export type FormBodyValue = string | number | boolean | Blob;
/** A flat array sends one part per element under the same field name. */
export type FormBodyValues = { readonly [field: string]: FormBodyValue | ReadonlyArray<FormBodyValue> };

/**
 * The typed client's multipart body wrapper (runtime discriminator for the
 * encoder). Produced by `formBody()` from `lugas/client`; a declared JSON
 * body never matches this shape, and the contract requires it exactly for
 * routes whose `body` slot is a `form()` descriptor.
 */
export type FormBodyInput = {
  readonly multipart: true;
  readonly values: FormBodyValues;
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

const REPEATED_MODES = new Set<FormRepeated>(["last-wins", "preserve"]);

export function form<TRepeated extends FormRepeated = "last-wins">(
  config: FormConfig & { readonly repeated?: TRepeated } = {},
): FormDescriptor<TRepeated> {
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_FORM_001", "form(): config must be an object", {
      hint: "pass form() or form({ maxFields, maxFiles, maxFileSize, repeated })",
    });
  }
  const known = new Set(["maxFields", "maxFiles", "maxFileSize", "repeated"]);
  for (const key of Object.keys(config)) {
    if (!known.has(key)) {
      throw diagnostic("LUGAS_FORM_001", `form(): unknown config key '${key}'`, {
        hint: "allowed keys: maxFields, maxFiles, maxFileSize, repeated",
        context: { key },
      });
    }
  }
  const repeated = config.repeated ?? "last-wins";
  if (!REPEATED_MODES.has(repeated)) {
    throw diagnostic("LUGAS_FORM_001", `form(): 'repeated' must be "last-wins" or "preserve"`, {
      hint: 'form({ repeated: "preserve" }) exposes every part per name under groups',
      context: { key: "repeated" },
    });
  }
  return Object.freeze({
    [formMarker]: true as const,
    maxFields: config.maxFields !== undefined ? positiveInteger(config.maxFields, "maxFields") : DEFAULT_MAX_FIELDS,
    maxFiles: config.maxFiles !== undefined ? positiveInteger(config.maxFiles, "maxFiles") : DEFAULT_MAX_FILES,
    maxFileSize: config.maxFileSize !== undefined ? positiveInteger(config.maxFileSize, "maxFileSize") : DEFAULT_MAX_FILE_SIZE,
    repeated,
  }) as FormDescriptor<TRepeated>;
}

/** Compile-time/pipeline detection: is this body slot a multipart codec? */
export function isFormDescriptor(value: unknown): value is FormDescriptor {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { [formMarker]?: unknown })[formMarker] === true
  );
}
