// Raw Bun equivalent: manual header check, JSON parse, field validation
export function createRawValidated() {
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      if (req.method !== "POST" || !req.url.includes("/api/users")) {
        return new Response("not found", { status: 404 });
      }
      const auth = req.headers.get("authorization");
      if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });
      let body: { name?: string; email?: string };
      try {
        body = (await req.json()) as { name?: string; email?: string };
      } catch { return new Response("bad json", { status: 400 }); }
      if (!body || typeof body !== "object") return new Response("bad json", { status: 400 });
      if (typeof body.name !== "string") return Response.json({ issues: [] }, { status: 422 });
      if (typeof body.email !== "string" || !body.email.includes("@")) return Response.json({ issues: [] }, { status: 422 });
      return new Response(JSON.stringify({ ok: true, name: body.name }), { status: 201, headers: { "content-type": "application/json" } });
    },
  });
  return server;
}
