/**
 * Shared smoke harness for the example scripts (CA-25).
 *
 * Follows the client/smoke.ts precedent: an example's exported app is
 * served in-process on an ephemeral port (no port conflicts, no readiness
 * races), and documented README/source behavior is asserted strictly.
 * Each smoke prints `<NAME>-SMOKE-OK` on success and exits non-zero with
 * context on the first failure.
 */

export interface ServedApp {
  base: string;
  stop(): void;
}

/** Serve an example app on an ephemeral port with production framing. */
export function serveApp(app: { serve(opts: unknown): { url: string | URL; stop(kill?: boolean): void } }): ServedApp {
  const server = app.serve({ port: 0, development: false });
  return { base: String(server.url), stop: () => server.stop(true) };
}

/** Assert `cond`; on failure abort the smoke with the failing check. */
export function check(cond: unknown, label: string): asserts cond {
  if (!cond) throw new Error(`check failed: ${label}`);
}

/** Assert a response status and return the parsed JSON body. */
export async function jsonAt(res: Response, status: number, label: string): Promise<any> {
  check(res.status === status, `${label}: expected ${status}, got ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}: body is not JSON: ${text.slice(0, 200)}`);
  }
}

/** Assert deep-subset equality (missing keys or value mismatches fail). */
export function matches(actual: unknown, expected: Record<string, unknown>, label: string): void {
  for (const [key, want] of Object.entries(expected)) {
    const got = (actual as Record<string, unknown>)?.[key];
    const wantJson = JSON.stringify(want);
    const gotJson = JSON.stringify(got);
    if (wantJson !== gotJson) {
      throw new Error(`${label}: field "${key}" expected ${wantJson}, got ${gotJson}`);
    }
  }
}

export interface CookieInfo {
  name: string;
  value: string;
  attrs: string[];
  raw: string;
}

/** Parse the first Set-Cookie header into name/value/attribute parts. */
export function firstCookie(res: Response): CookieInfo {
  const all = res.headers.getSetCookie();
  check(all.length > 0, "expected a Set-Cookie header");
  const raw = all[0]!;
  const [pair, ...attrs] = raw.split(";");
  const eq = pair!.indexOf("=");
  return { name: pair!.slice(0, eq).trim(), value: pair!.slice(eq + 1).trim(), attrs, raw };
}

export function attrContains(cookie: CookieInfo, attr: string, label: string): void {
  check(
    cookie.attrs.some((a) => a.trim().toLowerCase().startsWith(attr.toLowerCase())),
    `${label}: Set-Cookie missing ${attr} (got: ${cookie.raw})`,
  );
}

/** Run a smoke body: success prints the OK line; failure exits non-zero. */
export async function runSmoke(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`${name}-SMOKE-OK`);
  } catch (error) {
    console.error(`${name}-SMOKE-FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
