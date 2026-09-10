import { app } from "./app";

const server = app.serve({ port: Number(process.env.PORT ?? 3011) });
console.log(`telemetry proof app listening on ${server.url}`);
