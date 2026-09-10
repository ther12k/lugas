import { app } from "./app";

const server = app.serve({ port: Number(process.env.PORT ?? 3012) });
console.log(`rate-limit proof app listening on ${server.url}`);
