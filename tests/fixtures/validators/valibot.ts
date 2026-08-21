import * as v from "valibot";

export const valibotUserSchema = v.object({
  id: v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1)),
  name: v.pipe(v.string(), v.minLength(1)),
});
