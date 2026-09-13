// Emits the readiness line fragmented across three writes with pauses, so
// it cannot arrive in a single stdout chunk; a leading line is left
// incomplete on purpose (it must NOT be matched, and completing it later
// would be wrong — it is followed by a newline, making it "noise
// without..." + "\n", a complete NON-matching line). The matching token is
// split mid-word across writes. Also ignores nothing: exits 0 on SIGTERM.
process.on("SIGTERM", () => process.exit(0));
export {};
const write = (s: string): Promise<void> => new Promise((resolve) => process.stdout.write(s, () => resolve()));
const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

await write("noise without a newline");
await pause(25);
await write("\nLUGAS_STARTER_REA");
await pause(25);
await write("DY http://127.0.0.1:5987\n");
await pause(25);
await write("trailing incomplete, never terminated");
setInterval(() => {}, 60_000); // stay alive until stopped
