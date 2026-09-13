// Writes complete non-matching lines forever: flowing output must not
// satisfy readiness, and the deadline must still fire.
setInterval(() => process.stdout.write("noise line\n"), 10);
