import { app } from "./app";

const server = app.serve({ port: Number(process.env.PORT ?? 3001) });
console.log(`validation proof app listening on ${server.url}`);
