# Compression and ETag example

Demonstrates M9-007 ([ADR-0033](../../docs/okf/decisions/0033-compression-etag.md)):

- `GET /data` with `Accept-Encoding: gzip` → compressed body + `Vary: Accept-Encoding`.
- Every response carries a strong `ETag`; repeating the request with `If-None-Match` returns `304` with no body.

```bash
bun run examples/compression/server.ts
curl -sH "Accept-Encoding: gzip" -o /dev/null -w "gzip: %{size_download} bytes\n" localhost:3012/data
curl -s -o /dev/null -w "identity: %{size_download} bytes\n" localhost:3012/data
ETAG=$(curl -si localhost:3012/data | grep -i '^etag' | tr -d '\r' | cut -d' ' -f2)
curl -s -o /dev/null -w "conditional: %{http_code}\n" -H "If-None-Match: $ETAG" localhost:3012/data
```
