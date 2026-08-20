export {};

const target = Bun.argv[2];
if (!target) { console.error("usage: readiness.ts <url-or-port> [--timeout-ms N]"); process.exit(2); }
const timeout = Number(Bun.argv[Bun.argv.indexOf("--timeout-ms") + 1] ?? 5000);
const url = target.startsWith("http") ? target.replace(/\/$/, "") + "/__ready" : `http://localhost:${target}/__ready`;
const deadline = Date.now() + timeout;
while (Date.now() < deadline) { try { const response = await fetch(url); if (response.status === 200) { console.log("ready"); process.exit(0); } } catch {} await Bun.sleep(50); }
console.error(`timeout waiting for ${url}`); process.exit(1);
