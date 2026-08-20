export function start(name: string, routes: Record<string, unknown>, fetch?: (request: Request) => Response | Promise<Response>) {
  const port = Number(process.env.BENCH_PORT ?? process.env.PORT ?? 0);
  const server = Bun.serve({ port, routes: routes as any, fetch: fetch ?? (() => new Response("not found", { status: 404 })) });
  console.log(JSON.stringify({ fixture: name, bun: Bun.version, pid: process.pid, port: server.port }));
  console.log("READY");
  const stop = () => { server.stop(true); process.exit(0); };
  process.on("SIGTERM", stop); process.on("SIGINT", stop);
  return server;
}
