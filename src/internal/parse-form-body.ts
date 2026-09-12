/**
 * Bounded multipart body parsing (M9-005, ADR-0030).
 *
 * The raw body is read stream-wise up to the effective budget — refused
 * before reading when `Content-Length` already exceeds it, aborted at the
 * cap otherwise — and the buffered bytes are parsed by the platform's
 * `FormData` implementation over a synthetic request. Lugas ships no MIME
 * parser; the budget guarantee comes from bounding the bytes before parse.
 */
import type { FormDescriptor, FormRepeated, MultipartBody, MultipartBodyPreserved } from "../core/form";
import {
  createBodyBudgetProblem,
  createFormLimitProblem,
  createMalformedMultipartProblem,
  createUnsupportedMediaTypeProblem,
} from "./validation-problem";

export type ParseFormBodyResult =
  | { readonly ok: true; readonly data: MultipartBody | MultipartBodyPreserved }
  | { readonly ok: false; readonly response: Response };

function isMultipartContentType(contentType: string | null): boolean {
  if (contentType === null) return false;
  const mediaType = contentType.split(";")[0]!.trim().toLowerCase();
  return mediaType === "multipart/form-data" && /boundary=/i.test(contentType);
}

async function readBodyBytesBounded(
  request: Request,
  budget: number | undefined,
): Promise<{ ok: true; bytes: Uint8Array<ArrayBuffer> } | { ok: false; kind: "budget_exceeded" | "empty" }> {
  const contentLength = Number(request.headers.get("content-length") ?? Number.NaN);
  if (Number.isFinite(contentLength) && budget !== undefined && contentLength > budget) {
    return { ok: false, kind: "budget_exceeded" };
  }
  if (request.body === null) return { ok: false, kind: "empty" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value!.byteLength;
    if (budget !== undefined && received > budget) {
      try {
        await reader.cancel();
      } catch {
        // stream already errored/aborted; the failure response below stands
      }
      return { ok: false, kind: "budget_exceeded" };
    }
    chunks.push(value!);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

export async function parseFormBody(
  request: Request,
  descriptor: FormDescriptor<FormRepeated>,
  budget: number | undefined,
): Promise<ParseFormBodyResult> {
  const contentType = request.headers.get("content-type");
  if (!isMultipartContentType(contentType)) {
    return {
      ok: false,
      response: createUnsupportedMediaTypeProblem("Expected multipart/form-data with a boundary parameter"),
    };
  }

  const read = await readBodyBytesBounded(request, budget);
  if (!read.ok) {
    return {
      ok: false,
      response: read.kind === "budget_exceeded" ? createBodyBudgetProblem() : createMalformedMultipartProblem("Multipart body is empty"),
    };
  }

  // Platform parse over the bounded bytes: no Lugas MIME parser exists.
  let formData: { entries(): IterableIterator<[string, unknown]> };
  try {
    const synthetic = new Request("http://lugas.local/multipart", {
      method: "POST",
      headers: { "content-type": contentType! },
      body: read.bytes,
    });
    formData = await synthetic.formData();
  } catch {
    return { ok: false, response: createMalformedMultipartProblem() };
  }

  const fields: Record<string, string> = {};
  const files: Record<string, File> = {};
  // `repeated: "preserve"` additionally records every part per name, in wire
  // order; fields/files keep their documented last-wins contract in both modes.
  const preserve = descriptor.repeated === "preserve";
  const groups: Record<string, Array<string | File>> = {};
  let fieldCount = 0;
  let fileCount = 0;
  // Runtime parts are global File values; undici's *type* for the synthetic
  // request's FormData differs, so iterate as unknown entries and narrow.
  const entries = formData.entries();
  for (const [name, value] of entries) {
    if (typeof value === "string") {
      fieldCount += 1;
      if (fieldCount > descriptor.maxFields) {
        return { ok: false, response: createFormLimitProblem(`More than ${descriptor.maxFields} form fields`) };
      }
      fields[name] = value; // last-wins, mirroring parseCookies
    } else {
      fileCount += 1;
      if (fileCount > descriptor.maxFiles) {
        return { ok: false, response: createFormLimitProblem(`More than ${descriptor.maxFiles} form files`) };
      }
      const file = value as File;
      if (file.size > descriptor.maxFileSize) {
        return { ok: false, response: createFormLimitProblem(`File '${name}' exceeds ${descriptor.maxFileSize} bytes`) };
      }
      files[name] = file;
    }
    if (preserve) {
      const group = groups[name] ?? (groups[name] = []);
      group.push(value as string | File);
    }
  }
  const data: MultipartBody | MultipartBodyPreserved = preserve ? { fields, files, groups } : { fields, files };
  return { ok: true, data };
}
