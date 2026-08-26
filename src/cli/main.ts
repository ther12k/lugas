#!/usr/bin/env bun
/**
 * Lugas CLI entry point (M4-011).
 *
 * Commands:
 *   lugas routes <entry>     — human-readable route table
 *   lugas inspect <entry>    — JSON manifest to stdout
 *
 * Both commands use the safe subprocess import from load-app.ts.
 */
import { loadAppManifest } from "./load-app";

const HELP = `Lugas CLI

Usage:
  lugas routes <entry>       Show routes in a human-readable table
  lugas inspect <entry>      Output the full manifest as JSON

Options:
  --timeout <ms>             Subprocess timeout (default: 5000)
`;

type CliArgs = {
  command: "routes" | "inspect" | "help";
  entry?: string;
  timeout?: number;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { command: "help" };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i]!;
    if (arg === "--help" || arg === "-h") {
      args.command = "help";
      return args;
    }
    if (arg === "--timeout" && argv[i + 1]) {
      const raw = argv[i + 1]!;
      if (!/^\d+$/.test(raw) || Number.parseInt(raw, 10) <= 0) {
        throw new RangeError(`LUGAS_CLI_001: --timeout must be a positive integer in milliseconds, got '${raw}'`);
      }
      args.timeout = Number.parseInt(raw, 10);
      i += 2;
      continue;
    }
    if (arg === "routes" || arg === "inspect") {
      args.command = arg;
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.entry = next;
        i++;
      }
    }
    i++;
  }
  return args;
}

function renderHuman(manifestJson: string): string {
  const manifest = JSON.parse(manifestJson) as {
    format: string;
    frameworkVersion: string;
    bunCompatibility: string;
    modules: Array<{ name: string; routes: string[] }>;
    routes: Array<{ method: string; path: string; module: string | null; kind: string; validates: string[]; guards: string[] }>;
  };

  const lines: string[] = [];
  lines.push(`lugas-manifest (${manifest.format}, framework ${manifest.frameworkVersion})`);
  lines.push(`bun: ${manifest.bunCompatibility}`);
  lines.push("");

  for (const mod of manifest.modules) {
    lines.push(`module '${mod.name}': ${mod.routes.join(", ")}`);
  }
  if (manifest.modules.length > 0) lines.push("");

  lines.push("routes:");
  for (const r of manifest.routes) {
    const mod = r.module ? ` [${r.module}]` : "";
    const caps = r.validates.length > 0 ? ` validates:${r.validates.join("+")}` : "";
    const guards = r.guards.length > 0 ? ` guards:[${r.guards.join(",")}]` : "";
    lines.push(`  ${r.method.padEnd(7)} ${r.path}${mod}${caps}${guards} (${r.kind})`);
  }
  return lines.join("\n");
}

export function main(argv: string[]): void {
  const args = parseArgs(argv);

  switch (args.command) {
    case "help":
      console.log(HELP);
      process.exit(0);
      break;

    case "routes":
    case "inspect": {
      if (!args.entry) {
        console.error("error: missing entry file path");
        console.log(HELP);
        process.exit(3);
        break;
      }
      // (M6R1-007: --timeout validity is enforced in parseArgs)
      const result = loadAppManifest(args.entry, { timeoutMs: args.timeout });
      if (!result.ok) {
        console.error(`error: ${result.message}`);
        process.exit(result.exitCode);
        break;
      }
      if (args.command === "routes") {
        console.log(renderHuman(result.manifestJson));
      } else {
        console.log(result.manifestJson);
      }
      process.exit(0);
      break;
    }
  }
}

// Execute when run directly
if (import.meta.main) {
  main(process.argv.slice(2));
}
