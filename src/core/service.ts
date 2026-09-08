/**
 * Service lifecycle descriptors (M7-004, ADR-0020).
 *
 * A `service()` declaration attaches optional asynchronous `init`/`dispose`
 * to one entry of `defineApp({ services })`. At the type level `service()`
 * returns `T`, so handler context typing is unchanged. At runtime it returns
 * a frozen descriptor that `prepareApp` detects: the value is exposed to
 * handlers only after its `init` resolved (serve-time, before traffic is
 * processed), and `dispose` runs during lifecycle shutdown in reverse
 * initialization order.
 *
 * Plain (non-descriptor) service values keep today's live-reference contract
 * untouched and are never initialized or disposed.
 */
export const SERVICE_BRAND = "LugasServiceDescriptor";

export type ServiceConfig<T> = {
  /** Stable identifier used in lifecycle outcomes and diagnostics. */
  readonly name: string;
  /** The application-owned service value; never copied or wrapped. */
  readonly value: T;
  /** Runs at serve time, in declaration order, before traffic is processed. */
  readonly init?: (value: T) => void | Promise<void>;
  /** Runs at shutdown, in reverse initialization order, after a successful drain. */
  readonly dispose?: (value: T) => void | Promise<void>;
};

export type ServiceDescriptor<T> = {
  readonly [SERVICE_BRAND]: true;
  readonly name: string;
  readonly value: T;
  readonly init: ((value: T) => void | Promise<void>) | undefined;
  readonly dispose: ((value: T) => void | Promise<void>) | undefined;
};

export function isServiceDescriptor(value: unknown): value is ServiceDescriptor<unknown> {
  return (
    typeof value === "object" && value !== null &&
    (value as Record<string, unknown>)[SERVICE_BRAND] === true
  );
}

/**
 * Declares lifecycle behavior for one service entry. The returned value is
 * typed `T` and must be placed directly into `defineApp({ services })`;
 * using it anywhere else hands the raw descriptor to application code.
 */
export function service<T>(config: ServiceConfig<T>): T {
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_LIFECYCLE_001", "service(): config must be an object", {
      hint: "use service({ name, value, init?, dispose? })",
    });
  }
  if (typeof config.name !== "string" || config.name.length === 0) {
    throw diagnostic("LUGAS_LIFECYCLE_001", "service(): 'name' must be a non-empty string", {
      hint: "service names appear in shutdown outcomes and diagnostics",
      context: { key: "name" },
    });
  }
  for (const key of ["init", "dispose"] as const) {
    const hook = config[key];
    if (hook !== undefined && typeof hook !== "function") {
      throw diagnostic("LUGAS_LIFECYCLE_001", `service(): '${key}' must be a function`, {
        context: { key },
      });
    }
  }
  return Object.freeze({
    [SERVICE_BRAND]: true,
    name: config.name,
    value: config.value,
    init: config.init,
    dispose: config.dispose,
  }) as unknown as T;
}

import { diagnostic } from "../internal/diagnostics";
