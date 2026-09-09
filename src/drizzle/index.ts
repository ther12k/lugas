/**
 * `lugas/drizzle` — structural, application-owned Drizzle service adapter
 * (M9-001, ADR-0026).
 *
 * The adapter never imports drizzle-orm. It validates the structural CRUD
 * surface at declaration time (`LUGAS_DRIZZLE_001`), composes the existing
 * `service()` lifecycle (ADR-0020) unchanged, and lets handlers reach the
 * instance — with its exact type — through the typed `ctx.services`
 * contract (ADR-0011). No implicit I/O: no connection, query, ping, or
 * migration runs at startup, and no transaction is ever wrapped. Disposal
 * is application-owned by default; `closeOnDispose: true` wires dispose
 * through the instance's structural `$client.close()` and fails closed with
 * `LUGAS_DRIZZLE_002` when no closable client exists.
 */
import { diagnostic } from "../internal/diagnostics";
import { service } from "../core/service";

/**
 * Structural surface the adapter validates. Real Drizzle instances from any
 * driver satisfy it, and so does an honest test fake — there is no
 * `instanceof`, no brand check, and no drizzle-orm import anywhere.
 */
export interface DrizzleDbLike {
  select: Function;
  insert: Function;
  update: Function;
  delete: Function;
}

export type DrizzleServiceConfig<TDb extends DrizzleDbLike> = {
  /** The application-owned Drizzle instance; never copied or wrapped. */
  readonly db: TDb;
  /** Stable identifier used in lifecycle outcomes and diagnostics. */
  readonly name: string;
  /**
   * Wire `dispose` to close the instance's underlying `$client`. Default:
   * no dispose at all — the application owns shutdown. Requires a closable
   * `$client` at declaration time (`LUGAS_DRIZZLE_002` otherwise); clients
   * that dispose differently (e.g. pools exposing `end()`) compose
   * `service()` directly.
   */
  readonly closeOnDispose?: boolean;
};

type ClosableClient = { close: () => unknown };

function closableClient(db: object): ClosableClient | null {
  const client = (db as { $client?: unknown }).$client;
  if (typeof client !== "object" || client === null) return null;
  if (typeof (client as { close?: unknown }).close !== "function") return null;
  return client as ClosableClient;
}

/**
 * Declares a Drizzle instance as a Lugas service. The returned value is
 * typed as the exact `db` argument and must be placed directly into
 * `defineApp({ services })`; handlers reach it through
 * `ctx.services.<name>` with the full Drizzle instance type intact.
 */
export function drizzleService<TDb extends DrizzleDbLike>(
  config: DrizzleServiceConfig<TDb>,
): TDb {
  if (typeof config !== "object" || config === null) {
    throw diagnostic("LUGAS_DRIZZLE_001", "drizzleService(): config must be an object", {
      hint: "use drizzleService({ db, name, closeOnDispose? })",
    });
  }
  if (typeof config.db !== "object" || config.db === null) {
    throw diagnostic("LUGAS_DRIZZLE_001", "drizzleService(): 'db' is not a recognizable Drizzle instance", {
      hint: "pass the instance returned by drizzle(client) from any drizzle-orm driver",
    });
  }
  for (const method of ["select", "insert", "update", "delete"] as const) {
    if (typeof (config.db as Record<string, unknown>)[method] !== "function") {
      throw diagnostic(
        "LUGAS_DRIZZLE_001",
        `drizzleService(): 'db' is not a recognizable Drizzle instance (missing '${method}')`,
        {
          hint: "drizzleService validates the structural CRUD surface; the adapter never imports drizzle-orm",
          context: { method },
        },
      );
    }
  }
  if (config.closeOnDispose !== undefined && typeof config.closeOnDispose !== "boolean") {
    throw diagnostic("LUGAS_DRIZZLE_002", "drizzleService(): 'closeOnDispose' must be a boolean", {
      context: { key: "closeOnDispose" },
    });
  }
  const client = config.closeOnDispose === true ? closableClient(config.db) : null;
  if (config.closeOnDispose === true && client === null) {
    throw diagnostic("LUGAS_DRIZZLE_002", "drizzleService(): 'closeOnDispose' requires a closable '$client'", {
      hint: "closeOnDispose wires dispose through db.$client.close(); compose service() directly for clients that dispose differently",
    });
  }
  return service({
    name: config.name,
    value: config.db,
    ...(client === null
      ? {}
      : {
          dispose: (value: TDb) =>
            Promise.resolve(closableClient(value as object)!.close()).then(() => undefined),
        }),
  });
}
