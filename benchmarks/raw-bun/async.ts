import { start } from "./_shared";
start("async", { "/__ready": new Response("ready"), "/async": async () => { await Promise.resolve(); return Response.json({ ok: true }); } });
