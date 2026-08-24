
    import { defineApp } from "/home/ther12k/Workspace/Learning/lugas/.worktrees/M5-006/src/index";
    const app = defineApp({
      routes: {
        "/bench": { GET: () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } }) },
      },
    });
    const server = app.serve({ port: 0, development: false });
    console.log("PORT:" + server.port);
    setTimeout(() => { server.stop(true); process.exit(0); }, 500);
  