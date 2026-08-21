# M1 Package and Export Report

Root package export `.` points to `src/index.ts` for types/default source consumption. The package is still private and version `0.0.0`; no publication is authorized. The files whitelist includes source, root README/AGENTS, and canonical architecture docs. Client/testing subpaths remain reserved for M3/M4.

A local consumer fixture imports all M1 public values from `lugas` and typechecks; no runtime dependencies are shipped (Elysia remains dev-only).
