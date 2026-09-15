# Lugas SPA starter (Vite + React + Bun, one production process)

The canonical full-stack onboarding example and the reference application
for [ADR-0037](../../docs/okf/decisions/0037-spa-hosting.md): a **built**
Vite + React frontend and a typed Lugas API served by **one Bun process** —
no development tooling in production, no hosting glue in the app.

```
Build:  vite build → dist/          bun build → dist-server/main.js
Runtime: one Bun process
          ├── typed API (/api/*)
          ├── hashed assets (/assets/*, immutable cache, file-backed)
          └── SPA navigation fallback (/, /app/*, policy-capable shell)
```

New to Lugas? Follow [Your first feature](#your-first-feature-a-task-list)
below before anything else — it is deliberately small. The other
capabilities (uploads, SSE, …) are follow-on sections, not prerequisites.

## Run it

```bash
bun run setup   # pack this lugas checkout → install into the starter (consumer truth)
bun run build   # vite build → regenerate asset manifest → bundle the server entry
bun run start:built
# → http://localhost:3000  (deep-refresh http://localhost:3000/app/projects/42)
```

`bun run verify` runs the whole chain (setup → build → typecheck → tests →
distribution-mode parity). The tests skip when the starter is not set up;
`LUGAS_REQUIRE_STARTER=1` turns that skip into an explicit failure (CI
posture).

## Your first feature: a task list

The walkthrough answers one question: *how do I add a feature from the data
layer through the API to the frontend?* One resource — tasks — traced end
to end. It stores state in memory (reset on restart); when you outgrow
that, [`examples/drizzle`](../drizzle/) shows the same service boundary
backed by a database.

```
Schema / route declaration      server/tasks.ts + server/app.ts
          ↓
Handler + application-owned service   route() handlers call the task service
          ↓
AppContract                     src/App.tsx derives API from ReturnType<typeof createApp>
          ↓
Typed client call               createClient<API> — every outcome is typed
          ↓
React component + error handling    loading / empty / error / 422 issues / 401 sign-in
```

### 1. Declare the schema and the service (`server/tasks.ts`)

`TaskCreateSchema` is declared once with Zod and shared by the route
(validation) and the service (input type). The service module owns the
store and the rules; route declarations never touch storage details — that
boundary is what lets you swap the `Map` for Drizzle later without changing
routes.

### 2. Declare the routes (`server/app.ts`)

Four routes, one resource:

| Route | Protection | Typed outcomes the UI renders |
|---|---|---|
| `GET /api/tasks` | open | `200` — loading, empty (`[]`), and error states |
| `POST /api/tasks` | open | `201` created · `422` Problem Details with `issues[]` |
| `POST /api/tasks/:id/complete` | `requireSession` guard | `200` updated · `401 NO_SESSION` · `404 TASK_NOT_FOUND` |
| `DELETE /api/tasks/:id` | `requireSession` guard | `204` no body · `401` · `404` |

The `:id` routes declare `params: z.object({ id: z.string() })`, so
`ctx.params.id` is validated and fully typed at the handler. The protected
routes declare no header slot: browsers carry the httpOnly session cookie
automatically on same-origin requests (log in via `POST /api/login` first).

### 3. Derive the contract and call it (`src/App.tsx`)

```ts
type App = ReturnType<typeof createApp>;
type API = AppContract<App>;
const api = createClient<API>({ baseUrl: "" });   // same-origin, no header plumbing
```

Parameterized routes keep their `:pattern` key at the call site — actual
values travel in the `params` slot, typed against the route:

```ts
await api.post("/api/tasks/:id/complete", { params: { id: task.id } });
```

### 4. Render every outcome (`TasksPanel` in `src/App.tsx`)

What you see in the browser, mapped to the walkthrough goals:

| User action | What the example demonstrates |
|---|---|
| Open the task list | typed GET with loading, empty, and error states (+ retry) |
| Create a task with an empty title | declared schema → framework `422` → `issues[]` displayed inline under the form |
| Complete or delete before signing in | protected operation → `401` → unauthorized state with a Sign-in action |
| Complete or delete after signing in | `200`/`204` mutate the list; stale `404`s converge to server truth |
| Refresh `http://localhost:3000/app/projects/42` | SPA fallback serves the shell; API/asset ownership stays intact |
| `bun run build && bun run start:built` | one Bun process serves API + built frontend for deployment |

### 5. Watch it fail, then pass (recommended)

Run `bun run start:built`, open the app, and try it in order: submit an
empty title (see the inline `422` issues), press Complete (see the `401`
sign-in state), sign in, complete, delete. Every branch you exercise is
also pinned by `tests/starter.test.ts` → *"tasks walkthrough"*.

## Follow-on capabilities

None of these are needed for your first feature — they demonstrate the
rest of the shipped surface, one button each:

- **Typed GET** (`/api/hello`) and **validated mutation** (`/api/greetings`,
  the typed framework-422 branch in the result union).
- **Cookie login + me** (`/api/login`, `/api/me`): httpOnly cookie set by the
  server, sent automatically by the browser.
- **Multipart upload** (`formBody()` + `form({ repeated: "preserve" })`).
- **SSE** (`/api/events`) via the platform `EventSource`.
- **Deep navigate**: SPA fallback preserving the URL.

## Distribution modes: raw TypeScript vs pre-transpiled (compatibility, not a benchmark)

The starter runs the same unbundled server entry (`server/main.ts`) in two
modes against the same installed package:

```bash
bun run start:raw    # bun server/main.ts                       → installed lugas TypeScript source
bun run start:dist   # bun --conditions=lugas-dist server/main.ts → installed lugas emitted JavaScript
```

Lugas runs from TypeScript source by default on Bun and provides an
optional pre-transpiled JavaScript distribution. Both expose the same API;
the condition selects an implementation, not an optimization level.
`bun run verify:modes` proves it on this starter: both modes resolve
different files of the same package version and return identical responses
(status, content type, and body) across the task routes and the SPA shell.
No startup or memory claims are made or measured.

This walkthrough requires a checkout whose package carries the
dual-distribution exports (it packs `lugas-dist` itself via
`bun run setup`). The published `0.1.0-beta.5` npm package predates that
condition. The **production bundle is a separate concern**: once
`dist-server/main.js` is bundled, Lugas imports were resolved at build
time, so a runtime condition no longer demonstrates distribution selection.

## Frontend iteration

During development you can run `bunx vite` (the dev server) against a
separately started API — but the deployed shape is build-then-serve; Lugas
performs no runtime build and `vite preview` is not a production server.

## Notes

- The starter imports the **installed** `lugas` package
  (`file:lugas-starter.tgz`, refreshed by `bun run setup`) — never the
  repository checkout — so packaging and consumer-type failures surface here.
- `bun run measure` records the API-only vs API-plus-SPA comparison into
  `measurements/` (measurements to establish, not promised savings; see
  `docs/reports/issues/CA-14.md` for the v1→v2 harness repair).
- Native `assets.dirs` mounts are Linux-only (ADR-0018 amendment); this
  starter uses explicit file mappings only, which are cross-platform.
