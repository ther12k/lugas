/**
 * Stress: repeated and parallel test-server lifecycles (M4-006).
 *
 * Bounded but aggressive enough to surface port reuse, cross-talk, and
 * handle leaks. Every cycle verifies reachability before stop and
 * unreachability after stop.
 */
import { describe, expect, test } from "bun:test";
import { createTestServer } from "../../src/testing/test-server";
import { defineApp, json, route } from "../../src/index";

function markerApp(marker: string) {
  return defineApp({
    routes: {
      "/m": { GET: route({ handler: () => json(200, { marker }) }) },
    },
  });
}

describe("test server lifecycle stress", () => {
  test("25 sequential start/fetch/stop cycles leave no live handles", async () => {
    for (let i = 0; i < 25; i++) {
      const ts = createTestServer(markerApp(`seq-${i}`));
      const res = await ts.fetch("/m");
      expect((await res.json()) as { marker: string }).toEqual({ marker: `seq-${i}` });
      await ts.stop();
      let reachable = true;
      try {
        await fetch(new URL("/m", ts.url));
      } catch {
        reachable = false;
      }
      expect(reachable).toBe(false);
    }
  }, 30_000);

  test("8 concurrent servers stay isolated and all close cleanly", async () => {
    const servers = Array.from({ length: 8 }, (_, i) => createTestServer(markerApp(`par-${i}`)));
    try {
      const results = await Promise.all(
        servers.map(async (s) => ({
          marker: ((await (await s.fetch("/m")).json()) as { marker: string }).marker,
        })),
      );
      expect(results.map((r) => r.marker)).toEqual(servers.map((_, i) => `par-${i}`));
    } finally {
      await Promise.all(servers.map((s) => s.stop()));
    }
    for (const s of servers) {
      let failed = false;
      try {
        await fetch(new URL("/m", s.url));
      } catch {
        failed = true;
      }
      expect(failed).toBe(true);
    }
  }, 30_000);
});
