import { defineApp, json, route } from "lugas";

export const app = defineApp({ routes: { "/": route({ handler: () => json(200, { ok: true }) }) } });
