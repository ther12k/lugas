console.log("noisy stdout line 1");
console.error("noisy stderr with secret=abc123");
import { defineApp } from "../../../src/index";
export default defineApp({ routes: { "/ok": { GET: () => new Response("ok") } } });
