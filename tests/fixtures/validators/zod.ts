import { z } from "zod";

export const zodUserSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1),
});

export const zodAsyncUserSchema = zodUserSchema.transform(async (value) => ({
  ...value,
  label: `${value.id}:${value.name}`,
}));
