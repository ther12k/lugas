// server.ts
import app from "./app";

const server = app.serve({ port: 3000 });
console.log(`Lugas is listening on ${server.url}`);
