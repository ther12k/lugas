import { start } from "./_shared";
start("validation-placeholder", { "/__ready": new Response("ready"), "/validate": (req: Request) => { const ok = req.method === "GET"; return Response.json({ ok }, { status: ok ? 200 : 400 }); } });
