import { defineApp, route, json } from "../../src/index";

const PAYLOAD = "lugas compression example payload. ".repeat(100); // >1KB, compressible

export const app = defineApp({
  compression: true, // gzip/deflate negotiation with structural skips
  etag: true,        // strong SHA-1 validators + If-None-Match → 304
  routes: {
    "/data": {
      GET: route({ handler: () => json(200, { payload: PAYLOAD }) }),
    },
  },
});

export default app;
