import { app } from "./app";

const server = app.serve({ port: Number(process.env.PORT ?? 3002) });
console.log(`auth proof app listening on ${server.url}`);
