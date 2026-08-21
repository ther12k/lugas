# M1 Kernel Conformance

The M1 matrix covers response helpers, module/root composition, native Response passthrough, duplicate route rejection, repeated start/stop lifecycle, concurrent plain routes, type fixtures, and error redaction. Raw Bun native pass-through fixtures from M0 remain green. All integration fixtures consume `defineApp`/`route`/`defineModule`; internals are used only for focused unit tests.

No server leaks or unhandled rejections observed across five lifecycle iterations and twenty concurrent requests.
