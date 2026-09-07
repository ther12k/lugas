function colorjoyMain(f) {
  return f("/api/ping").then(function (r) { return r.json(); });
}
