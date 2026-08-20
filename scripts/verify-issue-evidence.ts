import { existsSync } from "node:fs";
const issueId = process.argv[2];
if (!issueId) { console.error("usage: bun run scripts/verify-issue-evidence.ts <ISSUE-ID>"); process.exit(2); }
const path = `docs/reports/issues/${issueId}.md`;
if (!existsSync(path)) { console.error(`missing evidence report: ${path}`); process.exit(1); }
console.log(`evidence present: ${path}`);
