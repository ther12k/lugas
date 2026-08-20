import { start } from "./_shared";
start("static", { "/": new Response("ok"), "/__ready": new Response("ready") });
