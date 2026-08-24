/**
 * Controlled benchmark runner (M5-001).
 *
 * Starts a server for each scenario, sends N concurrent requests for a
 * fixed duration, and collects latency/RPS samples. Verifies response
 * contract (status + body) on every request.
 */
import type { HarnessConfig, SampleRecord, ScenarioResult } from "./types";
export type { HarnessConfig };

export const DEFAULT_CONFIG: HarnessConfig = {
  warmupMs: 500,
  durationMs: 2_000,
  concurrency: 8,
  runs: 3,
};

type ServerFactory = () => { url: string; stop: () => void };

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(Math.ceil((p / 100) * sorted.length) - 1, sorted.length - 1);
  return sorted[Math.max(0, idx)]!;
}

/** Runs one measurement pass against the given server factory. */
export async function runScenario(
  name: string,
  createServer: ServerFactory,
  expectedPath: string,
  expectedStatus: number,
  config: HarnessConfig,
): Promise<ScenarioResult> {
  const { url, stop } = createServer();
  try {
    // Warmup
    const warmupDeadline = Date.now() + config.warmupMs;
    while (Date.now() < warmupDeadline) {
      await fetch(new URL(expectedPath, url));
    }

    // Measurement
    const latencies: number[] = [];
    let total = 0;
    const deadline = Date.now() + config.durationMs;

    const workers = Array.from({ length: config.concurrency }, async () => {
      while (Date.now() < deadline) {
        const start = performance.now();
        const res = await fetch(new URL(expectedPath, url));
        const elapsedUs = Math.round((performance.now() - start) * 1000);

        // Contract verification
        if (res.status !== expectedStatus) {
          throw new Error(`contract mismatch: expected ${expectedStatus}, got ${res.status}`);
        }
        await res.arrayBuffer(); // drain

        latencies.push(elapsedUs);
        total++;
      }
    });

    await Promise.all(workers);

    latencies.sort((a, b) => a - b);
    const durationSec = config.durationMs / 1_000;
    const rps = Math.round(total / durationSec);

    return {
      metadata: {
        timestamp: new Date().toISOString(),
        commit: "",
        bunVersion: Bun.version,
        cpuModel: "",
        memoryTotalMb: 0,
        scenario: name as never,
        warmupMs: config.warmupMs,
        durationMs: config.durationMs,
        concurrency: config.concurrency,
      },
      samples: [
        {
          requestsPerSecond: rps,
          p50LatencyUs: percentile(latencies, 50),
          p99LatencyUs: percentile(latencies, 99),
          totalRequests: total,
        },
      ],
    };
  } finally {
    stop();
  }
}
