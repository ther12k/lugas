/**
 * OKF bundle validator (issue M0-005).
 *
 * Re-establishes mechanically the structural guarantees that the OKF v0.2
 * generator established for the knowledge bundle under `docs/okf/`:
 *
 * - frontmatter parsing and required non-empty `type`;
 * - reserved-file rules (root `index.md`, directory `index.md`, `log.md`);
 * - local relative Markdown link resolution;
 * - issue DAG integrity (unique IDs, existing dependencies, symmetric
 *   `depends_on`/`blocks`, acyclicity, milestone gate ordering, gate
 *   existence, milestone/directory consistency);
 * - issue index coverage (milestone index and delivery issue index).
 *
 * The validator is strictly read-only: it never serializes or rewrites
 * bundle files, so unknown frontmatter fields survive by construction.
 * Output is deterministic (sorted file walk, sorted diagnostics) so it can
 * gate CI. Exit code 1 on any error, 0 otherwise.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, normalize, relative, resolve, sep } from "node:path";

/** Severity of a single finding. */
export type Severity = "error" | "warning";

/** One validator finding. `file` is a bundle-relative POSIX path. */
export interface Diagnostic {
  severity: Severity;
  code: string;
  file: string;
  message: string;
}

/** Result of validating one bundle. */
export interface ValidationResult {
  errors: Diagnostic[];
  warnings: Diagnostic[];
}

/* ------------------------------------------------------------------ */
/* Minimal YAML frontmatter parser                                     */
/* ------------------------------------------------------------------ */

type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue };

type YamlResult = { ok: true; value: YamlValue } | { ok: false; error: string };

interface YamlLine {
  indent: number;
  text: string;
  number: number;
}

const MILESTONES = ["m0", "m1", "m2", "m3", "m4", "m5", "m6"] as const;
const RECOGNIZED_STATUSES = new Set(["draft", "proposed", "accepted", "superseded", "stable"]);
const ISSUE_ID_PATTERN = /^M[0-6]-(?:GATE|[0-9]{3})$/;
const DATED_SECTION_PATTERN = /^## \d{4}-\d{2}-\d{2}(?: — .+)?$/;

/** Remove a trailing YAML comment, honoring simple quote state. */
function stripComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "#" && !inSingle && !inDouble && (i === 0 || line[i - 1] === " ")) {
      return line.slice(0, i);
    }
  }
  return line;
}

/** Parse a scalar token (quoted, flow sequence, plain). */
function parseScalar(text: string, lineNo: number): YamlResult {
  if (text.startsWith("'")) {
    if (text.length < 2 || !text.endsWith("'")) {
      return { ok: false, error: `line ${lineNo}: unterminated single-quoted scalar` };
    }
    return { ok: true, value: text.slice(1, -1).replaceAll("''", "'") };
  }
  if (text.startsWith('"')) {
    if (text.length < 2 || !text.endsWith('"')) {
      return { ok: false, error: `line ${lineNo}: unterminated double-quoted scalar` };
    }
    try {
      return { ok: true, value: JSON.parse(text) as YamlValue };
    } catch {
      return { ok: false, error: `line ${lineNo}: invalid double-quoted scalar` };
    }
  }
  if (text.startsWith("[") || text.startsWith("{")) {
    if (text.startsWith("{")) {
      return { ok: false, error: `line ${lineNo}: flow mappings are not supported by this validator` };
    }
    if (!text.endsWith("]")) {
      return { ok: false, error: `line ${lineNo}: unterminated flow sequence` };
    }
    const inner = text.slice(1, -1).trim();
    if (inner === "") return { ok: true, value: [] };
    const items: YamlValue[] = [];
    for (const part of inner.split(",")) {
      const trimmed = part.trim();
      const item = parseScalar(trimmed, lineNo);
      if (!item.ok) return item;
      items.push(item.value);
    }
    return { ok: true, value: items };
  }
  // Plain scalar rules: a plain scalar may not contain ": " or end with ":".
  if (text.includes(": ") || text.endsWith(":")) {
    return { ok: false, error: `line ${lineNo}: plain scalar contains an unexpected ':'` };
  }
  if (text === "true" || text === "false") return { ok: true, value: text === "true" };
  if (text === "null" || text === "~" || text === "Null" || text === "NULL") {
    return { ok: true, value: null };
  }
  if (/^-?\d+(\.\d+)?$/.test(text)) return { ok: true, value: Number(text) };
  return { ok: true, value: text };
}

interface ParseContext {
  lines: YamlLine[];
  pos: number;
}

function isSequenceItem(line: YamlLine): boolean {
  return line.text === "-" || line.text.startsWith("- ");
}

/** Parse a block node (mapping or sequence) starting at `indent`. */
function parseNode(ctx: ParseContext, indent: number): YamlResult {
  const first = ctx.lines[ctx.pos];
  if (first === undefined) return { ok: true, value: null };
  if (isSequenceItem(first)) return parseSequence(ctx, indent);
  return parseMapping(ctx, indent);
}

function parseMapping(ctx: ParseContext, indent: number): YamlResult {
  const map: { [key: string]: YamlValue } = {};
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    if (line === undefined) break;
    if (line.indent < indent) break;
    if (line.indent > indent) {
      return { ok: false, error: `line ${line.number}: unexpected indentation` };
    }
    if (isSequenceItem(line)) break;
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):(?:\s+(.*))?$/.exec(line.text);
    if (match === null) {
      return { ok: false, error: `line ${line.number}: expected 'key: value', got '${line.text}'` };
    }
    const key = match[1];
    if (key === undefined) {
      return { ok: false, error: `line ${line.number}: missing key` };
    }
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return { ok: false, error: `line ${line.number}: duplicate key '${key}'` };
    }
    const inlineRaw = match[2] ?? "";
    ctx.pos += 1;
    let value: YamlValue;
    if (inlineRaw.trim() === "") {
      const next = ctx.lines[ctx.pos];
      if (next !== undefined && next.indent > indent) {
        const nested = parseNode(ctx, next.indent);
        if (!nested.ok) return nested;
        value = nested.value;
      } else if (next !== undefined && next.indent === indent && isSequenceItem(next)) {
        // Block sequence at the parent key's own indentation (used by the bundle).
        const seq = parseSequence(ctx, indent);
        if (!seq.ok) return seq;
        value = seq.value;
      } else {
        value = null;
      }
    } else {
      const scalar = parseScalar(inlineRaw.trim(), line.number);
      if (!scalar.ok) return scalar;
      value = scalar.value;
    }
    map[key] = value;
  }
  return { ok: true, value: map };
}

function parseSequence(ctx: ParseContext, indent: number): YamlResult {
  const items: YamlValue[] = [];
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    if (line === undefined) break;
    if (line.indent < indent) break;
    if (line.indent > indent) {
      return { ok: false, error: `line ${line.number}: unexpected indentation` };
    }
    if (!isSequenceItem(line)) break;
    const itemText = line.text === "-" ? "" : line.text.slice(2).trim();
    ctx.pos += 1;
    if (itemText === "") {
      const next = ctx.lines[ctx.pos];
      if (next !== undefined && next.indent > indent) {
        const nested = parseNode(ctx, next.indent);
        if (!nested.ok) return nested;
        items.push(nested.value);
      } else {
        items.push(null);
      }
    } else {
      const scalar = parseScalar(itemText, line.number);
      if (!scalar.ok) return scalar;
      items.push(scalar.value);
    }
  }
  return { ok: true, value: items };
}

/** Parse a small YAML document (mappings, sequences, scalars; no anchors/multi-line scalars). */
function parseYaml(source: string): YamlResult {
  const lines: YamlLine[] = [];
  const rawLines = source.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    const raw = stripComment(rawLines[i] ?? "");
    if (raw.trim() === "") continue;
    const indent = raw.length - raw.trimStart().length;
    lines.push({ indent, text: raw.trim(), number: i + 1 });
  }
  if (lines.length === 0) return { ok: true, value: null };
  const first = lines[0];
  if (first === undefined) return { ok: true, value: null };
  const ctx: ParseContext = { lines, pos: 0 };
  const result = parseNode(ctx, first.indent);
  if (!result.ok) return result;
  if (ctx.pos < ctx.lines.length) {
    const leftover = ctx.lines[ctx.pos];
    return {
      ok: false,
      error: `line ${leftover?.number ?? 0}: unexpected trailing content '${leftover?.text ?? ""}'`,
    };
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Frontmatter extraction                                              */
/* ------------------------------------------------------------------ */

interface ParsedDocument {
  /** null when the file has no frontmatter delimiters at all. */
  frontmatter: { [key: string]: YamlValue } | null;
  body: string;
  parseError: string | null;
  /** True when a frontmatter block exists but could not be parsed. */
  hasBrokenFrontmatter: boolean;
}

function splitFrontmatter(content: string): ParsedDocument {
  const lines = content.split(/\r?\n/);
  const first = lines[0];
  if (first === undefined || first.trim() !== "---") {
    return { frontmatter: null, body: content, parseError: null, hasBrokenFrontmatter: false };
  }
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.trim() === "---") {
      close = i;
      break;
    }
  }
  if (close === -1) {
    return {
      frontmatter: null,
      body: "",
      parseError: "frontmatter block is not terminated by a closing '---'",
      hasBrokenFrontmatter: true,
    };
  }
  const yamlSource = lines.slice(1, close).join("\n");
  const body = lines.slice(close + 1).join("\n");
  const parsed = parseYaml(yamlSource);
  if (!parsed.ok) {
    return { frontmatter: null, body, parseError: parsed.error, hasBrokenFrontmatter: true };
  }
  if (parsed.value === null) {
    return { frontmatter: {}, body, parseError: null, hasBrokenFrontmatter: false };
  }
  if (typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return {
      frontmatter: null,
      body,
      parseError: "frontmatter must be a mapping",
      hasBrokenFrontmatter: true,
    };
  }
  return { frontmatter: parsed.value, body, parseError: null, hasBrokenFrontmatter: false };
}

/* ------------------------------------------------------------------ */
/* Link extraction                                                     */
/* ------------------------------------------------------------------ */

const INLINE_LINK_PATTERN = /!?\[([^\]]*)\]\(([^)]+)\)/g;
const INLINE_CODE_PATTERN = /`[^`\n]*`/g;

/** Extract relative link targets from a Markdown body, ignoring fenced/inline code. */
function extractLinkTargets(body: string): string[] {
  const withoutCode = stripFencedCode(body).replace(INLINE_CODE_PATTERN, "");
  const targets: string[] = [];
  let match: RegExpExecArray | null;
  INLINE_LINK_PATTERN.lastIndex = 0;
  while ((match = INLINE_LINK_PATTERN.exec(withoutCode)) !== null) {
    const raw = match[2];
    if (raw === undefined) continue;
    const target = raw.trim().split(/\s+/)[0] ?? "";
    if (target !== "") targets.push(target);
  }
  return targets;
}

function stripFencedCode(body: string): string {
  const out: string[] = [];
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) out.push(line);
  }
  return out.join("\n");
}

function isExternalTarget(target: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target);
}

/* ------------------------------------------------------------------ */
/* Bundle model                                                        */
/* ------------------------------------------------------------------ */

interface BundleFile {
  /** Bundle-relative POSIX path. */
  rel: string;
  abs: string;
  content: string;
  doc: ParsedDocument;
  isReservedIndex: boolean;
  isReservedLog: boolean;
  isRootIndex: boolean;
  /** Absolute normalized paths this file's Markdown links resolve to. */
  resolvedLinks: Set<string>;
}

interface IssueRecord {
  id: string;
  milestone: string;
  kind: string | null;
  dependsOn: string[];
  blocks: string[];
  file: BundleFile;
}

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

/** Walk the bundle depth-first with sorted entries; returns relative POSIX .md paths and all directories. */
function walkBundle(rootAbs: string): { files: string[]; dirs: string[] } {
  const files: string[] = [];
  const dirs: string[] = [];
  const visit = (abs: string, rel: string): void => {
    const entries = readdirSync(abs, { withFileTypes: true })
      .filter((entry) => entry.name !== ".DS_Store")
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      const childAbs = join(abs, entry.name);
      if (entry.isDirectory()) {
        dirs.push(childRel);
        visit(childAbs, childRel);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(childRel);
      }
    }
  };
  visit(rootAbs, "");
  return { files, dirs };
}

function resolveLinkTarget(file: BundleFile, target: string): string | null {
  if (target.startsWith("#") || isExternalTarget(target)) return null;
  const withoutFragment = target.includes("#") ? (target.split("#")[0] ?? "") : target;
  if (withoutFragment === "") return null;
  const unbracketed = withoutFragment.startsWith("<") && withoutFragment.endsWith(">")
    ? withoutFragment.slice(1, -1)
    : withoutFragment;
  const base = dirname(file.abs);
  const candidates = [unbracketed];
  if (unbracketed.includes("%")) {
    try {
      candidates.push(decodeURIComponent(unbracketed));
    } catch {
      // Malformed percent-encoding: fall through to the raw candidate.
    }
  }
  for (const candidate of candidates) {
    const normalized = normalize(join(base, candidate));
    if (existsSync(normalized) && statSync(normalized).isFile()) return normalized;
    if (existsSync(normalized) && statSync(normalized).isDirectory() && existsSync(join(normalized, "index.md"))) return join(normalized, "index.md");
  }
  return null;
}

function asStringArray(value: YamlValue | undefined, field: string, file: string): { ok: true; values: string[] } | { ok: false; message: string } {
  if (value === undefined) return { ok: true, values: [] };
  if (!Array.isArray(value)) {
    return { ok: false, message: `issue.${field} must be a list of IDs` };
  }
  const values: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.trim() === "") {
      return { ok: false, message: `issue.${field} must contain non-empty string IDs` };
    }
    values.push(item.trim());
  }
  return { ok: true, values };
}

/* ------------------------------------------------------------------ */
/* Core validation                                                     */
/* ------------------------------------------------------------------ */

function addError(errors: Diagnostic[], file: string, code: string, message: string): void {
  errors.push({ severity: "error", code, file, message });
}

function addWarning(warnings: Diagnostic[], file: string, code: string, message: string): void {
  warnings.push({ severity: "warning", code, file, message });
}

/**
 * Validate an OKF bundle. Pure with respect to the filesystem: reads only,
 * never writes, so unknown frontmatter fields are preserved untouched.
 */
export function validateBundle(root: string): ValidationResult {
  const errors: Diagnostic[] = [];
  const warnings: Diagnostic[] = [];
  const rootAbs = resolve(root);

  if (!existsSync(rootAbs) || !statSync(rootAbs).isDirectory()) {
    addError(errors, ".", "BUNDLE_ROOT_MISSING", `bundle root is not a directory: ${rootAbs}`);
    return { errors, warnings };
  }

  const { files: relFiles, dirs } = walkBundle(rootAbs);

  // ---- Reserved-file and directory rules -------------------------------
  for (const dir of dirs) {
    const indexPath = dir === "" ? "index.md" : `${dir}/index.md`;
    if (!relFiles.includes(indexPath)) {
      addError(errors, indexPath, "DIRECTORY_INDEX_MISSING", `directory '${dir === "" ? "." : dir}' has no index.md`);
    }
  }

  const bundleFiles: BundleFile[] = [];
  for (const rel of relFiles) {
    const abs = join(rootAbs, ...rel.split("/"));
    let content: string;
    try {
      content = readFileSync(abs, "utf8");
    } catch (error) {
      addError(errors, rel, "FILE_UNREADABLE", String(error));
      continue;
    }
    const doc = splitFrontmatter(content);
    const isRootIndex = rel === "index.md";
    const isReservedIndex = !isRootIndex && basename(rel) === "index.md";
    const isReservedLog = basename(rel) === "log.md";
    const bundleFile: BundleFile = {
      rel,
      abs,
      content,
      doc,
      isReservedIndex,
      isReservedLog,
      isRootIndex,
      resolvedLinks: new Set<string>(),
    };
    bundleFiles.push(bundleFile);

    if (isRootIndex) {
      if (doc.hasBrokenFrontmatter) {
        addError(errors, rel, "FRONTMATTER_PARSE", doc.parseError ?? "unparseable frontmatter");
      } else {
        const fm = doc.frontmatter;
        const keys = fm === null ? [] : Object.keys(fm).sort();
        const onlyVersion = keys.length === 1 && keys[0] === "okf_version";
        if (fm === null) {
          addError(errors, rel, "ROOT_INDEX_FRONTMATTER", "root index.md must declare okf_version frontmatter");
        } else if (!onlyVersion) {
          addError(
            errors,
            rel,
            "ROOT_INDEX_FRONTMATTER",
            `root index.md frontmatter must contain only okf_version, found: [${keys.join(", ")}]`,
          );
        } else {
          const version = fm["okf_version"];
          if (typeof version !== "string" || version.trim() === "") {
            addError(errors, rel, "ROOT_INDEX_FRONTMATTER", "okf_version must be a non-empty string");
          }
        }
      }
      continue;
    }

    if (isReservedIndex || isReservedLog) {
      if (doc.frontmatter !== null || doc.hasBrokenFrontmatter) {
        addError(errors, rel, "RESERVED_FRONTMATTER", "reserved files must not carry concept frontmatter");
      }
      if (isReservedLog) {
        validateReservedLog(bundleFile, errors);
      }
      continue;
    }

    // Non-reserved concept file: frontmatter with non-empty type.
    if (doc.hasBrokenFrontmatter) {
      addError(errors, rel, "FRONTMATTER_PARSE", doc.parseError ?? "unparseable frontmatter");
      continue;
    }
    if (doc.frontmatter === null) {
      addError(errors, rel, "FRONTMATTER_MISSING", "concept files must start with YAML frontmatter");
      continue;
    }
    const type = doc.frontmatter["type"];
    if (type === undefined || type === null) {
      addError(errors, rel, "FRONTMATTER_TYPE", "frontmatter must declare a non-empty 'type'");
    } else if (typeof type !== "string" || type.trim() === "") {
      addError(errors, rel, "FRONTMATTER_TYPE", "'type' must be a non-empty string");
    }
    const status = doc.frontmatter["status"];
    if (status !== undefined && (typeof status !== "string" || !RECOGNIZED_STATUSES.has(status))) {
      addWarning(
        warnings,
        rel,
        "FRONTMATTER_STATUS",
        `status '${String(status)}' is not one of [${[...RECOGNIZED_STATUSES].join(", ")}]`,
      );
    }
  }

  // ---- Link resolution --------------------------------------------------
  for (const file of bundleFiles) {
    const targets = extractLinkTargets(file.doc.hasBrokenFrontmatter ? "" : file.doc.body);
    for (const target of targets) {
      const resolved = resolveLinkTarget(file, target);
      if (resolved === null) continue; // External or anchor-only target: ignored.
      file.resolvedLinks.add(resolved);
      const relResolved = toPosix(relative(rootAbs, resolved));
      if (relResolved.startsWith("..") || normalize(join(rootAbs, relResolved)) !== resolved) {
        addError(
          errors,
          file.rel,
          "LINK_OUTSIDE_BUNDLE",
          `link target '${target}' resolves outside the bundle (${relResolved})`,
        );
      }
    }
  }
  // Broken-link detection needs one shared pass so targets can point at any file.
  for (const file of bundleFiles) {
    const targets = extractLinkTargets(file.doc.hasBrokenFrontmatter ? "" : file.doc.body);
    for (const target of targets) {
      if (target.startsWith("#") || isExternalTarget(target)) continue;
      const withoutFragment = target.includes("#") ? (target.split("#")[0] ?? "") : target;
      if (withoutFragment === "") continue;
      if (resolveLinkTarget(file, target) === null) {
        addError(errors, file.rel, "LINK_UNRESOLVED", `Markdown link target '${target}' does not resolve to a file`);
      }
    }
  }

  // ---- Issue DAG ---------------------------------------------------------
  validateIssueDag(rootAbs, bundleFiles, errors);

  // ---- Deterministic output ----------------------------------------------
  errors.sort(compareDiagnostics);
  warnings.sort(compareDiagnostics);
  return { errors, warnings };
}

function validateReservedLog(file: BundleFile, errors: Diagnostic[]): void {
  const lines = file.content.split(/\r?\n/);
  let title: string | null = null;
  const sections: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") continue;
    if (title === null) {
      if (/^# .+/.test(line)) {
        title = line;
      } else {
        addError(errors, file.rel, "LOG_PATTERN", "log.md must start with a '# ' title heading");
        title = "";
      }
    } else if (/^## /.test(line)) {
      sections.push(line);
    }
  }
  if (sections.length === 0) {
    addError(errors, file.rel, "LOG_PATTERN", "log.md must contain at least one dated '## YYYY-MM-DD' section");
    return;
  }
  for (const section of sections) {
    if (!DATED_SECTION_PATTERN.test(section)) {
      addError(
        errors,
        file.rel,
        "LOG_PATTERN",
        `log section '${section}' must use the reserved '## YYYY-MM-DD[ — title]' pattern`,
      );
    }
  }
}

interface DagInput {
  issues: IssueRecord[];
}

function collectIssues(rootAbs: string, bundleFiles: BundleFile[], errors: Diagnostic[]): Map<string, IssueRecord> {
  const issues = new Map<string, IssueRecord>();
  for (const file of bundleFiles) {
    const segments = file.rel.split("/");
    const inMilestoneDir =
      segments.length === 3 && segments[0] === "issues" && MILESTONES.includes(segments[1] as (typeof MILESTONES)[number]);
    if (!inMilestoneDir || file.isReservedIndex) continue;

    const fm = file.doc.frontmatter;
    if (fm === null || file.doc.hasBrokenFrontmatter) {
      addError(errors, file.rel, "ISSUE_ID_MISSING", "issue file must have parseable frontmatter with an issue.id");
      continue;
    }
    const issue = fm["issue"];
    if (issue === undefined || issue === null || typeof issue !== "object" || Array.isArray(issue)) {
      addError(errors, file.rel, "ISSUE_ID_MISSING", "issue file must declare an 'issue' mapping with a non-empty 'id'");
      continue;
    }
    const id = (issue as { [key: string]: YamlValue })["id"];
    if (typeof id !== "string" || id.trim() === "") {
      addError(errors, file.rel, "ISSUE_ID_MISSING", "issue.id must be a non-empty string");
      continue;
    }
    const trimmedId = id.trim();
    if (!ISSUE_ID_PATTERN.test(trimmedId)) {
      addError(errors, file.rel, "ISSUE_ID_FORMAT", `issue.id '${trimmedId}' does not match M<0-6>-(GATE|NNN)`);
    }
    const milestoneDir = segments[1] ?? "";
    const declaredMilestone = (issue as { [key: string]: YamlValue })["milestone"];
    if (
      typeof declaredMilestone !== "string" ||
      declaredMilestone.trim().toLowerCase() !== milestoneDir
    ) {
      addError(
        errors,
        file.rel,
        "ISSUE_MILESTONE_MISMATCH",
        `issue '${trimmedId}' declares milestone '${String(declaredMilestone)}' but lives in 'issues/${milestoneDir}'`,
      );
    }
    const kind = (issue as { [key: string]: YamlValue })["kind"];
    const dependsOnResult = asStringArray((issue as { [key: string]: YamlValue })["depends_on"], "depends_on", file.rel);
    const blocksResult = asStringArray((issue as { [key: string]: YamlValue })["blocks"], "blocks", file.rel);
    if (!dependsOnResult.ok || !blocksResult.ok) {
      addError(
        errors,
        file.rel,
        "ISSUE_METADATA",
        !dependsOnResult.ok ? dependsOnResult.message : (blocksResult as { ok: false; message: string }).message,
      );
      continue;
    }
    const record: IssueRecord = {
      id: trimmedId,
      milestone: milestoneDir,
      kind: typeof kind === "string" ? kind : null,
      dependsOn: dependsOnResult.values,
      blocks: blocksResult.values,
      file,
    };
    if (issues.has(trimmedId)) {
      const existing = issues.get(trimmedId);
      addError(
        errors,
        file.rel,
        "ISSUE_ID_DUPLICATE",
        `issue id '${trimmedId}' is already declared by '${existing?.file.rel ?? "?"}'`,
      );
      continue;
    }
    issues.set(trimmedId, record);
  }
  return issues;
}

function validateIssueDag(rootAbs: string, bundleFiles: BundleFile[], errors: Diagnostic[]): DagInput {
  const issues = collectIssues(rootAbs, bundleFiles, errors);

  // Reference existence and depends_on/blocks agreement.
  for (const issue of issues.values()) {
    for (const dep of issue.dependsOn) {
      if (!issues.has(dep)) {
        addError(errors, issue.file.rel, "ISSUE_DEPENDS_ON_UNKNOWN", `'${issue.id}' depends on unknown issue '${dep}'`);
      } else {
        const target = issues.get(dep);
        if (target !== undefined && !target.blocks.includes(issue.id)) {
          addError(
            errors,
            issue.file.rel,
            "ISSUE_RELATION_MISMATCH",
            `'${issue.id}' depends on '${dep}' but '${dep}'.blocks does not list '${issue.id}'`,
          );
        }
      }
      if (dep === issue.id) {
        addError(errors, issue.file.rel, "ISSUE_CYCLE", `issue '${issue.id}' depends on itself`);
      }
    }
    for (const blocked of issue.blocks) {
      if (!issues.has(blocked)) {
        addError(errors, issue.file.rel, "ISSUE_BLOCKS_UNKNOWN", `'${issue.id}' blocks unknown issue '${blocked}'`);
      } else {
        const target = issues.get(blocked);
        if (target !== undefined && !target.dependsOn.includes(issue.id)) {
          addError(
            errors,
            issue.file.rel,
            "ISSUE_RELATION_MISMATCH",
            `'${issue.id}' blocks '${blocked}' but '${blocked}'.depends_on does not list '${issue.id}'`,
          );
        }
      }
    }
  }

  // Acyclicity via Kahn's algorithm (edges: dependency -> dependent).
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const issue of issues.values()) {
    indegree.set(issue.id, 0);
  }
  for (const issue of issues.values()) {
    for (const dep of issue.dependsOn) {
      if (!issues.has(dep) || dep === issue.id) continue;
      indegree.set(issue.id, (indegree.get(issue.id) ?? 0) + 1);
      const list = dependents.get(dep);
      if (list === undefined) dependents.set(dep, [issue.id]);
      else list.push(issue.id);
    }
  }
  const queue: string[] = [];
  for (const [id, degree] of indegree) {
    if (degree === 0) queue.push(id);
  }
  const ordered: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    ordered.push(current);
    for (const next of dependents.get(current) ?? []) {
      const degree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, degree);
      if (degree === 0) queue.push(next);
    }
  }
  if (ordered.length < issues.size) {
    const leftover = [...issues.values()]
      .filter((issue) => (indegree.get(issue.id) ?? 0) > 0)
      .map((issue) => issue.id)
      .sort();
    for (const id of leftover) {
      const issue = issues.get(id);
      addError(
        errors,
        issue?.file.rel ?? "issues",
        "ISSUE_CYCLE",
        `issue '${id}' participates in (or depends on) a dependency cycle`,
      );
    }
  }

  // Transitive dependency sets for milestone gate ordering.
  const transitive = new Map<string, Set<string>>();
  const collectAncestors = (id: string, stack: Set<string>): Set<string> => {
    const memo = transitive.get(id);
    if (memo !== undefined) return memo;
    const ancestors = new Set<string>();
    const issue = issues.get(id);
    if (issue !== undefined) {
      for (const dep of issue.dependsOn) {
        if (!issues.has(dep)) continue;
        if (stack.has(dep)) continue; // Cycle already reported.
        ancestors.add(dep);
        for (const deep of collectAncestors(dep, new Set([...stack, dep]))) {
          ancestors.add(deep);
        }
      }
    }
    transitive.set(id, ancestors);
    return ancestors;
  };

  // Gate existence and milestone ordering.
  for (const milestone of MILESTONES) {
    const gateId = milestone.toUpperCase() + "-GATE";
    const gate = issues.get(gateId);
    const indexPath = `issues/${milestone}/index.md`;
    if (gate === undefined) {
      addError(errors, indexPath, "ISSUE_GATE_MISSING", `milestone '${milestone}' has no '${gateId}' issue`);
    } else if (gate.kind !== "gate") {
      addError(errors, gate.file.rel, "ISSUE_GATE_MISSING", `'${gateId}' must declare issue.kind 'gate'`);
    }
  }
  for (const issue of issues.values()) {
    const index = Number(issue.milestone.slice(1));
    if (Number.isNaN(index) || index < 1) continue;
    const predecessorGate = `M${index - 1}-GATE`;
    if (!issues.has(predecessorGate)) continue; // Missing gate already reported.
    const ancestors = collectAncestors(issue.id, new Set([issue.id]));
    if (!ancestors.has(predecessorGate)) {
      addError(
        errors,
        issue.file.rel,
        "ISSUE_GATE_ORDER",
        `'${issue.id}' (milestone ${issue.milestone.toUpperCase()}) does not transitively depend on '${predecessorGate}'`,
      );
    }
  }

  // Index coverage: milestone index links to every issue file in its directory.
  const byRel = new Map(bundleFiles.map((file) => [file.rel, file]));
  for (const milestone of MILESTONES) {
    const indexPath = `issues/${milestone}/index.md`;
    const indexFile = byRel.get(indexPath);
    for (const issue of issues.values()) {
      if (issue.milestone !== milestone) continue;
      if (indexFile === undefined) continue; // Missing index already reported.
      if (!indexFile.resolvedLinks.has(issue.file.abs)) {
        addError(
          errors,
          indexPath,
          "ISSUE_INDEX_COVERAGE",
          `milestone index does not link to '${issue.id}' (${basename(issue.file.rel)})`,
        );
      }
    }
  }

  // Global issue index coverage.
  const globalIndexPath = "delivery/issue-index.md";
  const globalIndex = byRel.get(globalIndexPath);
  if (globalIndex === undefined) {
    addError(errors, globalIndexPath, "ISSUE_GLOBAL_INDEX_MISSING", "delivery issue index file is missing");
  } else {
    const content = globalIndex.content;
    for (const issue of issues.values()) {
      if (!new RegExp(`\\b${issue.id.replace(/[-]/g, "\\-")}\\b`).test(content)) {
        addError(
          errors,
          globalIndexPath,
          "ISSUE_GLOBAL_INDEX_COVERAGE",
          `global issue index does not mention '${issue.id}'`,
        );
      }
    }
  }

  return { issues: [...issues.values()] };
}

function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
  if (a.code !== b.code) return a.code < b.code ? -1 : 1;
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

function formatDiagnostic(d: Diagnostic): string {
  return `${d.severity}[${d.code}] ${d.file}: ${d.message}`;
}

if (import.meta.main) {
  const rootArg = process.argv[2];
  const root = rootArg !== undefined && rootArg !== "" ? resolve(rootArg) : resolve(import.meta.dir, "..", "docs", "okf");
  const { errors, warnings } = validateBundle(root);
  for (const diagnostic of [...errors, ...warnings].sort(compareDiagnostics)) {
    console.log(formatDiagnostic(diagnostic));
  }
  console.log(`verify:docs ${errors.length === 0 ? "passed" : "FAILED"}: ${errors.length} error(s), ${warnings.length} warning(s)`);
  if (errors.length > 0) process.exit(1);
}
