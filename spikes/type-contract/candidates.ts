export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
export type Expect<T extends true> = T;
export type Schema<I, O = I> = { parse(input: I): O };
export type Json<S extends number, B> = { status: S; body: B };

export type Context = { user: { id: string }; session: string };
export function defineModule<S>() { return <T>(value: T) => value; }
export function guard<S>() { return <T>(value: T) => value; }
export function json<S extends number, B>(status: S, body: B): Json<S, B> { return { status, body }; }

export const moduleA = defineModule<{ db: string }>()({ name: "users" as const });
export const auth = guard<{}>()({ name: "auth" as const });
export const response = json(200, { ok: true });
export type ResponseCheck = Expect<Equal<typeof response, Json<200, { ok: boolean }>>>;
export type Lookup = { GET: { "/items/:id": { params: { id: string }; response: Json<200, { ok: boolean }> } } };
export type LookupCheck = Expect<Equal<Lookup["GET"]["/items/:id"]["params"], { id: string }>>;
