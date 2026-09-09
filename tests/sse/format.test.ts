/**
 * M8-002 — pure SSE frame serializer (ADR-0023).
 *
 * Pinned wire format: field order `id`, `event`, `retry`, then one `data:`
 * line per source line (CRLF/CR normalized to LF), frame terminated by a
 * blank line. Data is a string as-is or a JSON-serializable value (same
 * `JSON.stringify` semantics as `json()`). Invalid input throws stable
 * `LUGAS_SSE_002` diagnostics, never bare TypeErrors.
 */
import { describe, expect, test } from "bun:test";
import { formatSseEvent } from "../../src";

describe("M8-002 formatSseEvent wire format", () => {
  test("plain string data: single data line and blank-line terminator", () => {
    expect(formatSseEvent({ data: "hello" })).toBe("data: hello\n\n");
  });

  test("full field order: id, event, retry, data", () => {
    const frame = formatSseEvent({ id: "42", event: "tick", retry: 3000, data: "x" });
    expect(frame).toBe("id: 42\nevent: tick\nretry: 3000\ndata: x\n\n");
  });

  test("multi-line string data becomes one data line per source line", () => {
    expect(formatSseEvent({ data: "a\nb\nc" })).toBe("data: a\ndata: b\ndata: c\n\n");
  });

  test("CRLF and lone CR in data are normalized to LF before splitting", () => {
    expect(formatSseEvent({ data: "a\r\nb\rc" })).toBe("data: a\ndata: b\ndata: c\n\n");
  });

  test("JSON-serializable object and scalar data share JSON.stringify semantics", () => {
    expect(formatSseEvent({ data: { n: 1, nested: { ok: true } } })).toBe('data: {"n":1,"nested":{"ok":true}}\n\n');
    expect(formatSseEvent({ data: [1, 2] })).toBe("data: [1,2]\n\n");
    expect(formatSseEvent({ data: 7 })).toBe("data: 7\n\n");
    expect(formatSseEvent({ data: false })).toBe("data: false\n\n");
    expect(formatSseEvent({ data: null })).toBe("data: null\n\n");
  });

  test("non-finite numbers serialize as null on the wire (ECMA-262, pinned M6R9)", () => {
    expect(formatSseEvent({ data: Number.NaN })).toBe("data: null\n\n");
  });

  test("numeric and string ids are accepted", () => {
    expect(formatSseEvent({ id: 3, data: "x" })).toBe("id: 3\ndata: x\n\n");
    expect(formatSseEvent({ id: "abc", data: "x" })).toBe("id: abc\ndata: x\n\n");
  });

  test("invalid input throws LUGAS_SSE_002", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    const expectCode = (run: () => unknown, code: string): void => {
      try {
        run();
        throw new Error("expected throw");
      } catch (error) {
        expect((error as { code?: string }).code).toBe(code);
      }
    };
    expectCode(() => formatSseEvent(undefined as never), "LUGAS_SSE_002");
    expectCode(() => formatSseEvent({} as never), "LUGAS_SSE_002");
    expectCode(() => formatSseEvent({ data: undefined as never }), "LUGAS_SSE_002");
    expectCode(() => formatSseEvent({ data: 10n as never }), "LUGAS_SSE_002");
    expectCode(() => formatSseEvent({ data: (() => 1) as never }), "LUGAS_SSE_002");
    expectCode(() => formatSseEvent({ data: circular }), "LUGAS_SSE_002"); // circular
    expectCode(() => formatSseEvent({ data: "x", event: "" }), "LUGAS_SSE_002");
    expectCode(() => formatSseEvent({ data: "x", event: "a\nb" }), "LUGAS_SSE_002");
    expectCode(() => formatSseEvent({ data: "x", id: "a\nb" }), "LUGAS_SSE_002");
    expectCode(() => formatSseEvent({ data: "x", id: true as never }), "LUGAS_SSE_002");
    expectCode(() => formatSseEvent({ data: "x", retry: -1 }), "LUGAS_SSE_002");
    expectCode(() => formatSseEvent({ data: "x", retry: 1.5 }), "LUGAS_SSE_002");
  });
});
