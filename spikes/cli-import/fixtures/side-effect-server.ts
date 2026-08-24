import { defineApp } from "../../../src/index";
export default defineApp({ routes: {} });
Bun.serve({ port: 41_999, fetch: () => new Response("side-effect") });
