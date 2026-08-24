/**
 * Benchmark harness types (M5-001).
 *
 * Frozen schema for raw benchmark output. All scenarios produce this
 * shape so downstream analysis scripts can process uniformly.
 */

export type ScenarioName =
  | "raw-bun-static"
  | "raw-bun-json"
  | "lugas-static"
  | "lugas-json"
  | "lugas-async"
  | "lugas-params"
  | "lugas-validated"
  | "lugas-guards";

export type SampleRecord = {
  readonly requestsPerSecond: number;
  readonly p50LatencyUs: number;
  readonly p99LatencyUs: number;
  readonly totalRequests: number;
};

export type RunMetadata = {
  readonly timestamp: string;
  readonly commit: string;
  readonly bunVersion: string;
  readonly cpuModel: string;
  readonly memoryTotalMb: number;
  readonly scenario: ScenarioName;
  readonly warmupMs: number;
  readonly durationMs: number;
  readonly concurrency: number;
};

export type ScenarioResult = {
  readonly metadata: RunMetadata;
  readonly samples: ReadonlyArray<SampleRecord>;
};

export type HarnessConfig = {
  readonly warmupMs: number;
  readonly durationMs: number;
  readonly concurrency: number;
  readonly runs: number;
};
