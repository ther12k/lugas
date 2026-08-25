# M5 Native Route Security

## Findings

| Area | Finding | Status |
|---|---|---|
| Path normalization | Lugas performs none; Bun router is sole authority | Clean |
| Traversal | Encoded traversal does not bypass route matching | Clean |
| Classification | Native kinds correctly identified (handler/static/directory/lugas) | Clean |
| Unknown values | Rejected before server start with stable diagnostic | Clean |
| Method passthrough | Function and bare descriptor routes serve all methods | Clean |

## Application responsibility

Native `{ dir }` routes serve files from disk. The application is responsible
for not placing sensitive files in the served directory.
