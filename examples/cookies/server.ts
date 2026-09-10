import { app } from "./app";

const server = app.serve({ port: Number(process.env.PORT ?? 3007) });
console.log(`cookies proof app listening on ${server.url}`);
