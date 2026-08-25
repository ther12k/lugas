import { analyzePath } from "./src/internal/path";
import { defineApp } from "./src/core/app";

console.log("analyzePath result:", JSON.stringify(analyzePath("users/:id")));

try {
  defineApp({ routes: { "users/:id": { GET: () => new Response("x") } } as never });
  console.log("defineApp: NO THROW");
} catch (e: any) {
  console.log("defineApp THREW:", e.message.slice(0, 100));
}
