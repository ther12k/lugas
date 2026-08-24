Bun.serve({ port: 43_777, fetch: () => new Response("leaked") });
console.log("[fixture] server started");
