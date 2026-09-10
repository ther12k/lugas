import { app } from "./app";

const server = app.serve({ port: Number(process.env.PORT ?? 3010) });
console.log(`uploads proof app listening on ${server.url}`);
