import { start } from "./_shared";
const routes: Record<string, Response | ((req: Request) => Response)> = { "/__ready": new Response("ready") };
for (let i = 0; i < 1000; i++) routes[`/route/${i}`] = () => Response.json({ route: i });
start("large-routes", routes);
