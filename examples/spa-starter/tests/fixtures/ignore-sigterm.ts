// Traps SIGTERM and keeps running: stopServer must escalate to SIGKILL
// within its bound. Writes READY once the handler is registered, so tests
// never signal a half-booted child.
process.on("SIGTERM", () => {
  // deliberately ignored
});
process.stdout.write("READY\n");
setInterval(() => {}, 60_000);
