# Static example

Opt-in public asset serving (ADR-0018) over an API: an explicit file mapping
for `/index.html` and a directory mount under `/assets/*`, next to two JSON
routes.

```bash
bun run server.ts
curl -s http://localhost:3000/index.html          # page (file mapping)
curl -s http://localhost:3000/assets/app.js       # asset (directory mount)
curl -s http://localhost:3000/assets/styles.css   # asset (MIME + caching validators)
curl -s http://localhost:3000/api/ping            # API route
curl -si http://localhost:3000/assets/nope.js     # asset miss → plain 404
curl -si -X POST http://localhost:3000/assets/app.js  # disallowed method → not-found policy
```

Notice the miss distinction: `assets/nope.js` returns Bun's native asset 404,
while unknown API paths return the app's JSON not-found policy.
