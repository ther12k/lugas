import { app } from "./app";

const server = app.serve({ port: Number(process.env.PORT ?? 3000) });
console.log(`basic proof app listening on ${server.url}`);
