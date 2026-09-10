import { app } from "./app";

const server = app.serve({ port: Number(process.env.PORT ?? 3009) });
console.log(`production proof app listening on ${server.url}`);
