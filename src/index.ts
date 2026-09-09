/** Public root export map for Lugas v0.x. */
export { defineApp } from "./core/app";
export type { AppConfig, LugasAppInstance } from "./core/app";
export { defineModule } from "./core/module";
export type { ModuleConfig } from "./core/module";
export { route } from "./core/route";
export type { RouteConfig } from "./core/route";
export { guard } from "./core/guard";
export type { GuardConfig } from "./core/guard";
export { service } from "./core/service";
export type { ServiceConfig, ServiceDescriptor } from "./core/service";
export { sse, formatSseEvent } from "./core/sse";
export type { SseConfig, SseEventInput, SseWriter } from "./core/sse";
export type { LugasLifecycle, ShutdownOutcome, ShutdownOptions } from "./internal/lifecycle";
export type { CorsConfig, CorsOriginDecision, CorsOriginInput } from "./internal/cors";
export type {
  CompiledLogging,
  LogSink,
  LoggingConfig,
  LugasLogEntry,
  LugasLogFields,
  LugasLogLevel,
} from "./internal/logging";
export { empty, json, problem, redirect, text } from "./core/response";
export type { Jsonify, ProblemFields, RedirectStatus, TypedResponse } from "./core/response";
export type {
  AppContract,
  FlattenPathMethods,
  RouteContract,
  RouteInputContract,
} from "./core/contract";
export type {
  GuardDescriptor,
  GuardHandler,
  HttpMethod,
  LugasApp,
  ModuleDescriptor,
  RouteDescriptor,
  RouteHandler,
  SchemaLike,
} from "./core/types";
