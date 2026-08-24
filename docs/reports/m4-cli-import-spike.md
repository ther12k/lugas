---
type: Spike Report
title: CLI Safe Application Import — Findings and Decision
status: complete
tags:
- cli
- spike
- import-safety
- m4
---

# M4-010: CLI Safe Application Import Spike

## Question

Can a CLI (`lugas routes`, `lugas inspect`) import an application module without starting servers, hanging handles, or executing unacceptable side effects?

## Probe setup

Six fixtures under `spikes/cli-import/fixtures/`:

1. Clean app with default export (safe baseline)
2. Clean app with named export only
3. App that starts a server during import (anti-pattern)
4. App with a timer keeping the event loop alive (anti-pattern)
5. App that throws if environment variable is missing
6. App using top-level await

Each fixture imported in a fresh Bun subprocess by `run.ts`. Probe measures exit code, wall time, whether a known port becomes active, and stdout/stderr.

## Results

| Fixture | Exit code | Duration | Server started? | Classification |
|---|---|---|---|---|
| clean-default.ts | 0 | ~30 ms | No | SAFE |
| clean-named.ts | 0 | ~13 ms | No | SAFE |
| side-effect-server.ts | timeout (killed) | ~3006 ms | Yes (port 41,999) | HANG |
| hanging-timer.ts | timeout (killed) | ~3006 ms | No (timer) | HANG |
| env-dependent.ts | 1 | ~8 ms | No | CRASH (expected: missing env) |
| async-init.ts | 0 | ~212 ms | No | SAFE but delayed |

## Key findings

1. Clean apps safe to import: `defineApp()` composes into frozen state without starting servers or opening handles. <50 ms.
2. Server-start anti-pattern hangs: `Bun.serve()` at module scope prevents exit. CLI must use subprocess timeout and kill.
3. Timer anti-pattern also hangs.
4. Environment-dependent imports crash cleanly with non-zero exit — detectable.
5. Top-level await works but delays readiness; safe with bounded timeout.

## Decision: direct dynamic import with subprocess isolation

**M4-011 (`lugas routes` / `lugas inspect --json`) is authorized** using:

- Spawn subprocess (`bun <entry>`) with configurable timeout (default 3 s).
- Timeout → kill + stable diagnostic explaining possible server/handle leak.
- Success → read manifest from `default` or named `app` export.
- Import crash → report stderr as diagnostic.
- Exit codes: 0 = manifest, 1 = import error, 2 = timeout/hang, 3 = no Lugas app exported.
- Never import user modules in-process; always isolate via subprocess.

### Alternative considered: explicit manifest file
A pre-built JSON would avoid execution but adds build-step dependency and risks staleness. Deferred.

### Alternative rejected: AST-based extraction
Cannot handle dynamic patterns, re-exports, conditional declarations, third-party route factories.

## Security considerations

Subprocess isolation prevents untrusted code from affecting the CLI process. Timeout prevents hostile applications from blocking tooling. Stdout/stderr captured but not executed. Environment inheritance documented as trust boundary.

## Limitations

Tested Linux x86-64 Bun 1.4.0 only. Port-probe detection heuristic. `{ dir }` native type not tested here (requires filesystem path).
