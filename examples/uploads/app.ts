import { form, defineApp, json, route } from "../../src/index";

export const app = defineApp({
  bodyBudget: 1024 * 1024, // 1 MiB app default; the route may override
  routes: {
    "/upload": {
      POST: route({
        body: form({ maxFields: 16, maxFiles: 4, maxFileSize: 256 * 1024 }),
        handler: (ctx) =>
          json(201, {
            note: ctx.body.fields["note"] ?? null,
            saved: Object.entries(ctx.body.files).map(([name, file]) => ({
              field: name,
              filename: file.name,
              type: file.type,
              size: file.size,
            })),
          }),
      }),
    },
  },
});

export default app;
