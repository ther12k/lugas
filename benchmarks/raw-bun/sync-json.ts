import { start } from "./_shared";
start("sync-json", { "/__ready": new Response("ready"), "/json": () => Response.json({ ok: true }) });
