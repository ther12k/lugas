import app from "./app";

const server = app.serve({ port: 3000, development: false });
console.log(`Lugas static example on ${server.url}`);
console.log(`  page   ${server.url}index.html`);
console.log(`  asset  ${server.url}assets/app.js`);
console.log(`  api    ${server.url}api/ping`);
