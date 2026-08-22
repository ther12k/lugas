/**
 * Compile-time Route and Application Contract extraction (M3-001).
 *
 * Extracts the compile-time route and application contract from `typeof app`
 * without adding runtime metadata or enumerable properties.
 */
import type {
  LugasApp,
  RouteDescriptor,
  RouteResponseUnion,
  TypedResponse,
} from "./types";
import type { StandardSchemaOutput } from "../internal/standard-schema";

export type RouteInputContract<TDescriptor> = TDescriptor extends {
  readonly params?: infer P;
  readonly query?: infer Q;
  readonly headers?: infer H;
  readonly body?: infer B;
}
  ? {
      readonly params: P extends { readonly "~standard": unknown } ? StandardSchemaOutput<P> : undefined;
      readonly query: Q extends { readonly "~standard": unknown } ? StandardSchemaOutput<Q> : undefined;
      readonly headers: H extends { readonly "~standard": unknown } ? StandardSchemaOutput<H> : undefined;
      readonly body: B extends { readonly "~standard": unknown } ? StandardSchemaOutput<B> : undefined;
    }
  : {
      readonly params: undefined;
      readonly query: undefined;
      readonly headers: undefined;
      readonly body: undefined;
    };

export type RouteContract<TEntry> = TEntry extends {
  readonly handler: infer H;
  readonly before?: infer G;
}
  ? {
      readonly kind: "lugas";
      readonly input: RouteInputContract<TEntry>;
      readonly responses: RouteResponseUnion<H, G extends ReadonlyArray<unknown> ? G : []>;
    }
  : TEntry extends Response | TypedResponse
  ? {
      readonly kind: "native-response";
      readonly input: {
        readonly params: undefined;
        readonly query: undefined;
        readonly headers: undefined;
        readonly body: undefined;
      };
      readonly responses: TEntry;
    }
  : {
      readonly kind: "native";
      readonly input: {
        readonly params: undefined;
        readonly query: undefined;
        readonly headers: undefined;
        readonly body: undefined;
      };
      readonly responses: Response;
    };

export type FlattenPathMethods<TPathEntry> = TPathEntry extends RouteDescriptor<any, any>
  ? { readonly ALL: RouteContract<TPathEntry> }
  : TPathEntry extends Response | TypedResponse
  ? { readonly GET: RouteContract<TPathEntry> }
  : TPathEntry extends Record<string, unknown>
  ? {
      readonly [K in keyof TPathEntry as Uppercase<string & K>]: RouteContract<TPathEntry[K]>;
    }
  : { readonly ALL: RouteContract<TPathEntry> };

export type AppContract<TApp> = TApp extends LugasApp<any, infer TRoutes>
  ? {
      readonly [Path in keyof TRoutes as string & Path]: FlattenPathMethods<TRoutes[Path]>;
    }
  : {};
