# Uploads example

Demonstrates M9-005 ([ADR-0030](../../docs/okf/decisions/0030-multipart-forms.md)): bounded multipart parsing with native `File` values.

- `POST /upload` accepts up to 4 files of 256 KiB each plus 16 text fields, within the app's 1 MiB body budget.
- Over-budget bodies are refused with `413 BODY_BUDGET_EXCEEDED`; over-limit shapes with `413 FORM_LIMIT_EXCEEDED`.

```bash
bun run examples/uploads/server.ts
curl -s -F note=hello -F doc=@./README.md localhost:3010/upload
curl -s -o /dev/null -w "%{http_code}\n" -F big=@/dev/urandom localhost:3010/upload  # 413 (read bounded)
```
