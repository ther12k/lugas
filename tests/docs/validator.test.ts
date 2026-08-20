import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateBundle } from "../../scripts/verify-okf";

const fixture = (body: string) => { const d = mkdtempSync(join(tmpdir(), "lugas-okf-")); writeFileSync(join(d, "index.md"), `---\nokf_version: "0.2"\n---\n`); writeFileSync(join(d, "doc.md"), body); return d; };

test("real bundle passes", () => expect(validateBundle("docs/okf").errors).toHaveLength(0));
test("missing type fails", () => expect(validateBundle(fixture("---\n---\n# x\n")).errors.length).toBeGreaterThan(0));
test("broken link fails", () => expect(validateBundle(fixture("---\ntype: doc\n---\n[x](missing.md)\n")).errors.some(e => e.code === "LINK_UNRESOLVED")).toBe(true));
test("unknown frontmatter is read-only", () => { const d = fixture("---\ntype: doc\ncustom: keep\n---\n"); const before = Bun.file(join(d, "doc.md")); const text = readFileSync(join(d, "doc.md"), "utf8"); validateBundle(d); expect(readFileSync(join(d, "doc.md"), "utf8")).toBe(text); });
