// Exits 0 on SIGTERM (graceful-shutdown shape). Writes READY once the
// handler is registered, so tests never signal a half-booted child.
process.on("SIGTERM", () => process.exit(0));
process.stdout.write("READY\n");
setInterval(() => {}, 60_000);
