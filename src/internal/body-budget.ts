/**
 * Body budget selection and clamping (M7-003, ADR-0019 as amended).
 *
 * `selectedBudget = routeOverride ?? applicationDefault ?? serverCeiling`
 * and `effectiveBudget = min(serverCeiling, selectedBudget)`: an override
 * relaxes the application default, never the ceiling. When no budget is
 * configured the result is `undefined` — existing server-ceiling behavior
 * is preserved byte-for-byte. The ceiling is the serve-time
 * `maxRequestBodySize` when explicitly configured (M7-002); `serve()`
 * rejects explicitly configured budgets above that ceiling at startup
 * (LUGAS_BODY_003), so clamping is a defense-in-depth backstop.
 */
export type BudgetsContext = {
  /** Application default budget in bytes (`defineApp({ bodyBudget })`). */
  readonly appDefault: number | undefined;
  /** Serve-time ceiling slot; filled by `serveApp()` when configured. */
  readonly ceilingRef: { current: number | undefined };
  /** Every explicitly configured route budget (startup audit + rejection). */
  readonly routeBudgets: number[];
};

export function createBudgetsContext(appDefault: number | undefined): BudgetsContext {
  return { appDefault, ceilingRef: { current: undefined }, routeBudgets: [] };
}

export function resolveEffectiveBudget(
  routeBudget: number | undefined,
  budgets: BudgetsContext,
): number | undefined {
  const selected = routeBudget ?? budgets.appDefault;
  if (selected === undefined) return undefined;
  const ceiling = budgets.ceilingRef.current;
  return ceiling !== undefined ? Math.min(selected, ceiling) : selected;
}
