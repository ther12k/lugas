/**
 * Verifier mutation tests (M6-006-EH #294).
 *
 * Proves the compatibility verifier is a real gate: each seeded drift in a
 * sandbox copy (doc / workflow / lockfile) must produce exit 1 with a
 * diagnosable message. Healthy copies pass.
 */
import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const VERIFIER = resolve(ROOT, "scripts/verify-compatibility-report.ts");

interface Sandbox {
  root: string;
  cleanup(): void;
  /** Absolute path of an invocation-ready copy of the verifier. */
  verifierCopy: string;
}

function buildSandbox(mutate: (root: string) => void): Sandbox {
  const root = mkdtempSync(join(tmpdir(), "lugas-verifmut-"));
  // Copy the minimal file set the verifier reads + its own source.
  for (const rel of ["docs/compatibility.md", "package.json", "bun.lock", ".github/workflows/compatibility.yml"]) {
    const dest = join(root, rel);
    mkdirSync(join(dest, ".."), { recursive: true });
    cpSync(resolve(ROOT, rel), dest);
  }
  mkdirSync(join(root, "scripts"), { recursive: true });
  const src = readFileSync(VERIFIER, "utf8").replace(
    'const ROOT = resolve(import.meta.dir, "..");',
    'const ROOT = import.meta.dir + "/..";',
  );
  const verifierCopy = join(root, "scripts/verify.ts");
  writeFileSync(verifierCopy, src);
  mutate(root);
  return { root, verifierCopy, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function runSandbox(sb: Sandbox): { code: number; output: string } {
  const proc = Bun.spawnSync(["bun", "run", sb.verifierCopy], {
    cwd: sb.root, stdout: "pipe", stderr: "pipe",
  });
  return {
    code: proc.exitCode ?? 1,
    output: new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr),
  };
}

function patch(root: string, rel: string, from: string | RegExp, to: string): void {
  const p = join(root, rel);
  if (!existsSync(p)) throw new Error(`sandbox missing ${rel}`);
  const s = readFileSync(p, "utf8");
  if (typeof from === "string") {
    if (!s.includes(from)) throw new Error(`mutation target not found in ${rel}: ${from}`);
    writeFileSync(p, s.replace(from, to));
  } else {
    if (!from.test(s)) throw new Error(`mutation regex not found in ${rel}`);
    writeFileSync(p, s.replace(from, to));
  }
}

describe("verifier mutation tests (#294)", () => {
  test("healthy files PASS", () => {
    const sb = buildSandbox(() => {});
    try {
      const r = runSandbox(sb);
      expect(r.code).toBe(0);
      expect(r.output).toContain("PASS");
    } finally {
      sb.cleanup();
    }
  });

  test("stale TypeScript pin FAILs (no hard-coded special case)", () => {
    const sb = buildSandbox((root) => {
      // Bump package.json AND bun.lock together; doc stays at old version.
      patch(
        root,
        "bun.lock",
        '"typescript": ["typescript@7.0.2"',
        '"typescript": ["typescript@7.0.3"',
      );
    });
    try {
      const r = runSandbox(sb);
      expect(r.code).toBe(1);
      // The doc's stale pin must be reported against the bumped resolution.
      expect(r.output.toLowerCase()).toContain("typescript");
    } finally {
      sb.cleanup();
    }
  });

  test("stale validator version FAILs", () => {
    const sb = buildSandbox((root) => {
      patch(root, "bun.lock", '"valibot": ["valibot@1.4.2"', '"valibot": ["valibot@1.5.0"');
    });
    try {
      const r = runSandbox(sb);
      expect(r.code).toBe(1);
      expect(r.output).toContain("lock-resolved valibot");
    } finally {
      sb.cleanup();
    }
  });

  test("missing matrix cell (empty mark) FAILs", () => {
    const sb = buildSandbox((root) => {
      // Blank the windows cell of the 1.4.0 row.
      patch(
        root,
        "docs/compatibility.md",
        "| Server core | **1.4.0** | 1.4.0 | ✅ | ✅ | ✅ |",
        "| Server core | **1.4.0** | 1.4.0 | ✅ | ✅ |   |",
      );
    });
    try {
      const r = runSandbox(sb);
      expect(r.code).toBe(1);
      expect(r.output).toContain("windows-latest/1.4.0");
    } finally {
      sb.cleanup();
    }
  });

  test("broad-semver claims FAIL", () => {
    const cases: Array<[string, string]> = [
      ["^1.4", "Supported from **^1.4** onward"],
      ["~1.4", "Supported from **~1.4** onward"],
      [">=1.4", "Requires Bun >=1.4"],
      ["1.x", "Works on Bun 1.x everywhere"],
    ];
    for (const [label, injected] of cases) {
      const sb = buildSandbox((root) => {
        patch(root, "docs/compatibility.md", "## Type checking", `${injected}\n\n## Type checking`);
      });
      try {
        const r = runSandbox(sb);
        expect(r.code, label).toBe(1);
        expect(r.output, label).toContain("broad semver");
      } finally {
        sb.cleanup();
      }
    }
  });

  test("unknown runner image FAILs instead of silently meaning Windows", () => {
    const sb = buildSandbox((root) => {
      patch(root, ".github/workflows/compatibility.yml", "os: [ubuntu-latest, macos-latest, windows-latest]", "os: [ubuntu-latest, macos-latest, freebsd-latest]");
    });
    try {
      const r = runSandbox(sb);
      expect(r.code).toBe(1);
      expect(r.output).toContain("freebsd-latest→UNKNOWN");
    } finally {
      sb.cleanup();
    }
  });

  test("extra undeclared doc row FAILs", () => {
    const sb = buildSandbox((root) => {
      patch(
        root,
        "docs/compatibility.md",
        "| Server core | **1.4.x** latest patch near release | recorded in CI summary per run | ✅ | ✅ | ✅ |",
        "| Server core | **1.4.x** latest patch near release | recorded in CI summary per run | ✅ | ✅ | ✅ |\n| Server core | **1.5.0** | claimed anyway | ✅ | ✅ | ✅ |",
      );
    });
    try {
      const r = runSandbox(sb);
      expect(r.code).toBe(1);
      expect(r.output).toContain("matches workflow matrix");
    } finally {
      sb.cleanup();
    }
  });
});
