import { start } from "./_shared";
start("params", { "/__ready": new Response("ready"), "/items/:id": (_req: Request) => Response.json({ id: "sample" }) });
