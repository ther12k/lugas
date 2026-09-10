import { app } from "./app";

const server = app.serve({
  port: Number(process.env.PORT ?? 3008),
  shutdown: { signals: true }, // Ctrl-C closes sockets with 1001 Going Away
});
console.log(`websockets proof app listening on ${server.url}`);
