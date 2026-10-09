"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { NumberField, SelectField, TextField } from "@/components/ui/fields";
import { StatTile } from "@/components/ui/StatTile";
import type { CLMMConfig } from "@/domain/clmm";
import type { HedgeSimulatorConfig } from "@/domain/hedge";
import type { FeeAssumption } from "@/domain/scenario";
import type { ForwardScenarioConfig } from "@/services/forwardScenario";
import { computeForwardScenario, type ForwardScenarioResult } from "@/services/forwardScenario";
import { linspace } from "@/utils/array";
import { formatNumber, formatPercent, formatSigned } from "@/utils/format";

/**
 * Hedge workspace (Phase 4, docs/06 "Dynamic Hedge").
 *
 * Forward what-if simulator over the EXISTING exact CLMM engine plus the new
 * tranche hedge simulator: explicit price path from the current state, fixed/
 * dynamic/threshold hedge modes, target ratio, tranches with FIFO reductions,
 * funding modeled separately, rebalance costs, cooldown/minimum rebalance, an
 * append-only event log, and residual delta. Read-only research tool: nothing
 * here connects a wallet, signs, or executes (docs/09).
 *
 * What-if projections stay clearly labeled as scenarios, never predictions
 * (docs/06 cross-phase rule 11).
 */

interface HedgeFormState {
  volatileSymbol: string;
  stableSymbol: string;
  entryPrice: string;
  initialValue: string;
  lowerPrice: string;
  upperPrice: string;
  pathMin: string;
  pathMax: string;
  pathSteps: string;
  feeApr: string;
  stepHours: string;
  fundingApr: string;
  includeFunding: boolean;
  hedgeMode: "fixed" | "dynamic" | "threshold";
  targetRatioPct: string;
  rebalanceThresholdPct: string;
  minRebalancePct: string;
  cooldownSeconds: string;
  rebalanceFeePct: string;
  rebalanceSlippagePct: string;
  rebalanceFixedCost: string;
}

const INITIAL_FORM: HedgeFormState = {
  volatileSymbol: "SOL",
  stableSymbol: "USDC",
  entryPrice: "150",
  initialValue: "3000",
  lowerPrice: "100",
  upperPrice: "225",
  pathMin: "75",
  pathMax: "225",
  pathSteps: "31",
  feeApr: "40",
  stepHours: "24",
  fundingApr: "10",
  includeFunding: true,
  hedgeMode: "dynamic",
  targetRatioPct: "75",
  rebalanceThresholdPct: "5",
  minRebalancePct: "1",
  cooldownSeconds: "3600",
  rebalanceFeePct: "0.04",
  rebalanceSlippagePct: "0.06",
  rebalanceFixedCost: "0",
};

interface ParsedForm {
  ok: boolean;
  errors: string[];
  config: ForwardScenarioConfig | null;
  stable: string;
  volatile: string;
}

function parseForm(form: HedgeFormState): ParsedForm {
  const errors: string[] = [];
  const volatile = form.volatileSymbol.trim() || "volatile";
  const stable = form.stableSymbol.trim() || "stable";

  const entryPrice = Number(form.entryPrice);
  const initialValue = Number(form.initialValue);
  const lowerPrice = Number(form.lowerPrice);
  const upperPrice = Number(form.upperPrice);
  const pathMin = Number(form.pathMin);
  const pathMax = Number(form.pathMax);
  const pathSteps = Number(form.pathSteps);
  const feeApr = Number(form.feeApr);
  const stepHours = Number(form.stepHours);
  const fundingApr = Number(form.fundingApr);
  const targetRatioPct = Number(form.targetRatioPct);
  const thresholdPct = Number(form.rebalanceThresholdPct);
  const minRebalancePct = Number(form.minRebalancePct);
  const cooldownSeconds = Number(form.cooldownSeconds);
  const rebalanceFeePct = Number(form.rebalanceFeePct);
  const rebalanceSlippagePct = Number(form.rebalanceSlippagePct);
  const rebalanceFixedCost = Number(form.rebalanceFixedCost);

  const positive = (v: number, message: string) => {
    if (!Number.isFinite(v) || v <= 0) errors.push(message);
  };
  const nonNegative = (v: number, message: string) => {
    if (!Number.isFinite(v) || v < 0) errors.push(message);
  };

  positive(entryPrice, "Entry price must be a positive number.");
  positive(initialValue, "Initial LP value must be a positive number.");
  positive(lowerPrice, "Lower price must be a positive number.");
  positive(upperPrice, "Upper price must be a positive number.");
  if (
    Number.isFinite(lowerPrice) &&
    Number.isFinite(upperPrice) &&
    lowerPrice >= upperPrice
  ) {
    errors.push("Upper price must be greater than lower price.");
  }
  if (
    Number.isFinite(entryPrice) &&
    Number.isFinite(lowerPrice) &&
    Number.isFinite(upperPrice) &&
    !(entryPrice > lowerPrice && entryPrice < upperPrice)
  ) {
    errors.push(
      "In-range entry required: lower price < entry price < upper price (exact model).",
    );
  }
  positive(pathMin, "Path minimum price must be a positive number.");
  positive(pathMax, "Path maximum price must be a positive number.");
  if (Number.isFinite(pathMin) && Number.isFinite(pathMax) && pathMax < pathMin) {
    errors.push("Path maximum price must be greater than or equal to the minimum.");
  }
  if (!Number.isInteger(pathSteps) || pathSteps < 2 || pathSteps > 501) {
    errors.push("Path steps must be an integer between 2 and 501.");
  }
  nonNegative(feeApr, "Fee APR must be non-negative.");
  positive(stepHours, "Fee step hours must be positive.");
  nonNegative(fundingApr, "Funding APR must be non-negative.");
  if (!Number.isFinite(targetRatioPct) || targetRatioPct < 0 || targetRatioPct > 100) {
    errors.push("Target hedge ratio must be between 0 and 100.");
  }
  if (form.hedgeMode === "threshold") {
    if (!Number.isFinite(thresholdPct) || thresholdPct < 0 || thresholdPct > 100) {
      errors.push("Rebalance threshold must be between 0 and 100.");
    }
  }
  if (!Number.isFinite(minRebalancePct) || minRebalancePct < 0 || minRebalancePct > 100) {
    errors.push("Minimum rebalance ratio must be between 0 and 100.");
  }
  nonNegative(cooldownSeconds, "Cooldown seconds must be non-negative.");
  nonNegative(rebalanceFeePct, "Rebalance fee must be non-negative.");
  nonNegative(rebalanceSlippagePct, "Rebalance slippage must be non-negative.");
  nonNegative(rebalanceFixedCost, "Rebalance fixed cost must be non-negative.");

  if (errors.length > 0) {
    return { ok: false, errors, config: null, stable, volatile };
  }

  const clmm: CLMMConfig = { entryPrice, lowerPrice, upperPrice, initialValueStable: initialValue };
  const fees: FeeAssumption | null =
    feeApr > 0 ? { feeApr: feeApr / 100, stepHours } : null;
  // Funding APR is applied per step via the per-interval convention.
  const fundingRate = form.includeFunding && fundingApr > 0 ? fundingApr / 100 : null;
  const fundingIntervalHours = form.includeFunding && fundingApr > 0 ? stepHours : null;
  const hedge: HedgeSimulatorConfig = {
    mode: form.hedgeMode,
    targetRatio: targetRatioPct / 100,
    rebalanceThreshold: thresholdPct / 100,
    minRebalanceRatio: minRebalancePct / 100,
    cooldownSeconds,
    rebalanceFeeRate: rebalanceFeePct / 100,
    rebalanceSlippageRate: rebalanceSlippagePct / 100,
    rebalanceFixedCost,
  };

  return {
    ok: true,
    errors: [],
    stable,
    volatile,
    config: {
      clmm,
      pathPrices: linspace(pathMin, pathMax, pathSteps),
      fees,
      hedge,
      fundingRate,
      fundingIntervalHours,
    },
  };
}

export function HedgeWorkspace() {
  const [form, setForm] = useState<HedgeFormState>(INITIAL_FORM);

  const parsed = useMemo(() => parseForm(form), [form]);

  const result: ForwardScenarioResult | null = useMemo(() => {
    if (!parsed.ok || !parsed.config) return null;
    try {
      return computeForwardScenario(parsed.config);
    } catch {
      // Domain engines validate deeply; a thrown validation means invalid input.
      return null;
    }
  }, [parsed]);

  const set = <K extends keyof HedgeFormState>(key: K, value: HedgeFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const stable = parsed.stable;
  const volatile = parsed.volatile;
  const lastPoint = result?.points[result.points.length - 1] ?? null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Pool / Pair" />
            <div className="grid grid-cols-2 gap-3 px-4 py-4">
              <TextField
                id="hVolatile"
                label="Volatile token"
                value={form.volatileSymbol}
                onChange={(v) => set("volatileSymbol", v)}
                placeholder="SOL"
              />
              <TextField
                id="hStable"
                label="Stable token"
                value={form.stableSymbol}
                onChange={(v) => set("stableSymbol", v)}
                placeholder="USDC"
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Position (exact CLMM)" />
            <div className="space-y-3 px-4 py-4">
              <NumberField
                id="hEntryPrice"
                label="Entry price"
                unit={`${stable} per 1 ${volatile}`}
                value={form.entryPrice}
                onChange={(v) => set("entryPrice", v)}
              />
              <NumberField
                id="hInitialValue"
                label="Initial LP value"
                unit={stable}
                value={form.initialValue}
                onChange={(v) => set("initialValue", v)}
                hint="Converted to exact position liquidity L at entry; range tracks the position."
              />
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="hLowerPrice"
                  label="Lower price"
                  unit={stable}
                  value={form.lowerPrice}
                  onChange={(v) => set("lowerPrice", v)}
                />
                <NumberField
                  id="hUpperPrice"
                  label="Upper price"
                  unit={stable}
                  value={form.upperPrice}
                  onChange={(v) => set("upperPrice", v)}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Price path (what-if)" />
            <div className="grid grid-cols-2 gap-3 px-4 py-4">
              <NumberField
                id="hPathMin"
                label="Min price"
                unit={stable}
                value={form.pathMin}
                onChange={(v) => set("pathMin", v)}
              />
              <NumberField
                id="hPathMax"
                label="Max price"
                unit={stable}
                value={form.pathMax}
                onChange={(v) => set("pathMax", v)}
              />
              <NumberField
                id="hPathSteps"
                label="Steps"
                unit="2–501"
                className="col-span-2"
                value={form.pathSteps}
                onChange={(v) => set("pathSteps", v)}
              />
              <p className="col-span-2 text-[11px] leading-snug text-faint">
                Hypothetical future prices — explicitly a scenario surface,
                not a prediction (docs/06).
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Fees & funding"
              actions={<Badge variant="warn">Simplified</Badge>}
            />
            <div className="grid grid-cols-2 gap-3 px-4 py-4">
              <NumberField
                id="hFeeApr"
                label="Fee APR"
                unit="%"
                value={form.feeApr}
                onChange={(v) => set("feeApr", v)}
                hint="Accrues only while in range."
              />
              <NumberField
                id="hStepHours"
                label="Hours per step"
                unit="h"
                value={form.stepHours}
                onChange={(v) => set("stepHours", v)}
              />
              <label htmlFor="hIncludeFunding" className="mt-1 flex items-center gap-2 text-xs text-muted">
                <input
                  id="hIncludeFunding"
                  type="checkbox"
                  checked={form.includeFunding}
                  onChange={(e) => set("includeFunding", e.target.checked)}
                  className="size-3.5 accent-[color:var(--color-accent,#0ea5e9)]"
                />
                Include funding
              </label>
              {form.includeFunding ? (
                <NumberField
                  id="hFundingApr"
                  label="Funding APR"
                  unit="%"
                  value={form.fundingApr}
                  onChange={(v) => set("fundingApr", v)}
                  hint="Paid on the open short each step; modeled separately from price PnL."
                />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Hedge"
              actions={<Badge variant="accent">{form.hedgeMode}</Badge>}
            />
            <div className="space-y-3 px-4 py-4">
              <SelectField
                id="hHedgeMode"
                label="Mode"
                value={form.hedgeMode}
                onChange={(v) => set("hedgeMode", v)}
                options={[
                  { value: "fixed", label: "Fixed — open once, then hold" },
                  { value: "dynamic", label: "Dynamic — track target ratio" },
                  { value: "threshold", label: "Threshold — rebalance on drift" },
                ]}
              />
              <NumberField
                id="hTargetRatio"
                label="Target hedge ratio"
                unit="% of exposure"
                value={form.targetRatioPct}
                onChange={(v) => set("targetRatioPct", v)}
                hint="Default dynamic target is 75% (docs/04)."
              />
              {form.hedgeMode === "threshold" ? (
                <NumberField
                  id="hThreshold"
                  label="Rebalance threshold"
                  unit="% drift"
                  value={form.rebalanceThresholdPct}
                  onChange={(v) => set("rebalanceThresholdPct", v)}
                />
              ) : null}
              <NumberField
                id="hMinRebalance"
                label="Minimum rebalance"
                unit="% of exposure"
                value={form.minRebalancePct}
                onChange={(v) => set("minRebalancePct", v)}
              />
              <NumberField
                id="hCooldown"
                label="Cooldown"
                unit="seconds"
                value={form.cooldownSeconds}
                onChange={(v) => set("cooldownSeconds", v)}
                hint="Minimum time between accepted rebalances (docs/06)."
              />
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  id="hRebalanceFee"
                  label="Rebalance fee"
                  unit="%"
                  value={form.rebalanceFeePct}
                  onChange={(v) => set("rebalanceFeePct", v)}
                />
                <NumberField
                  id="hRebalanceSlippage"
                  label="Slippage"
                  unit="%"
                  value={form.rebalanceSlippagePct}
                  onChange={(v) => set("rebalanceSlippagePct", v)}
                />
                <NumberField
                  id="hRebalanceFixed"
                  label="Fixed cost"
                  unit={stable}
                  className="col-span-2"
                  value={form.rebalanceFixedCost}
                  onChange={(v) => set("rebalanceFixedCost", v)}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {!parsed.ok ? (
            <EmptyState title="Fix the inputs to see the hedge simulation">
              <ul className="list-inside list-disc space-y-1 text-left text-sm text-muted">
                {parsed.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </EmptyState>
          ) : !result || result.points.length === 0 ? (
            <EmptyState
              title="Simulation unavailable"
              description="The hedge simulator could not run with these inputs."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile
                  label="Short quantity (end)"
                  value={`${formatNumber(result.hedgeState.shortQuantity, 4)} ${volatile}`}
                  sub={`${formatPercent(result.hedgeState.targetRatio, 0)} target ratio`}
                />
                <StatTile
                  label="Hedge PnL (end)"
                  value={formatSigned(
                    (lastPoint?.hedge.unrealizedPnl ?? 0) + (lastPoint?.hedge.realizedPnl ?? 0),
                    2,
                  )}
                  sub="unrealized + realized"
                  tone={(lastPoint?.hedge.unrealizedPnl ?? 0) + (lastPoint?.hedge.realizedPnl ?? 0) >= 0 ? "profit" : "loss"}
                />
                <StatTile
                  label="Funding paid (total)"
                  value={formatNumber(result.hedgeState.accumulatedFunding, 4)}
                  sub={result.includesFunding ? "separate from price PnL" : "funding not included"}
                />
                <StatTile
                  label="Rebalance costs (total)"
                  value={formatNumber(result.hedgeState.accumulatedRebalanceCosts, 4)}
                  sub="fee + slippage + fixed"
                />
                <StatTile
                  label="Combined value (end)"
                  value={formatNumber(lastPoint?.combinedValue ?? 0, 2)}
                  sub="LP + fees − costs − funding + hedge"
                />
                <StatTile
                  label="Combined PnL (end)"
                  value={formatSigned(lastPoint?.combinedPnl ?? 0, 2)}
                  tone={(lastPoint?.combinedPnl ?? 0) >= 0 ? "profit" : "loss"}
                />
                <StatTile
                  label="Residual delta (end)"
                  value={formatNumber(lastPoint?.residualDelta ?? 0, 4)}
                  sub="LP delta − short quantity"
                />
                <StatTile
                  label="Fees earned (total)"
                  value={formatNumber(lastPoint?.lp.cumulativeFees ?? 0, 4)}
                  sub={result.includesFees ? "simplified, in-range only" : "fees not included"}
                />
              </div>

              <Card>
                <CardHeader
                  title="PnL path"
                  actions={
                    <div className="flex items-center gap-3 text-[11px] text-muted">
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-faint" />
                        LP PnL
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-warn" />
                        Hedge PnL
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="inline-block h-0.5 w-4 bg-accent" />
                        Combined PnL
                      </span>
                    </div>
                  }
                />
                <div className="overflow-x-auto px-2 py-3">
                  <MiniLineChart points={result.points} stable={stable} />
                </div>
              </Card>

              <Card>
                <CardHeader
                  title={`Hedge event log (${result.hedgeEvents.length})`}
                  actions={<Badge variant="muted">{form.hedgeMode} mode</Badge>}
                />
                <div className="max-h-[360px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-panel">
                      <tr className="border-b border-border text-[11px] uppercase tracking-wider text-faint">
                        <th scope="col" className="px-4 py-2 font-medium">Tick</th>
                        <th scope="col" className="px-4 py-2 font-medium">Event</th>
                        <th scope="col" className="px-4 py-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.hedgeEvents.map((event) => (
                        <tr key={event.index} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-2 font-mono text-xs tabular-nums text-muted">
                            {event.atTick} @ {formatNumber(event.price, 2)}
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              variant={
                                event.type === "open" || event.type === "increase"
                                  ? "warn"
                                  : event.type === "reduce" || event.type === "closed"
                                    ? "accent"
                                    : event.type === "funding"
                                      ? "profit"
                                      : "muted"
                              }
                            >
                              {event.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-xs text-muted">{event.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <CardHeader
                  title={`Scenario table (${stable} per 1 ${volatile})`}
                  actions={<Badge variant="warn">Scenario, not prediction</Badge>}
                />
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-panel">
                      <tr className="border-b border-border text-[11px] uppercase tracking-wider text-faint">
                        <th scope="col" className="px-4 py-2 font-medium">Price</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">{volatile} amount</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">{stable} amount</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">LP value</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Fees cum.</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Short qty</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Hedge PnL</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Combined PnL</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">Residual Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.points.map((point) => (
                        <tr key={point.step} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-2 font-mono tabular-nums">{formatNumber(point.price, 2)}</td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                            {formatNumber(point.lp.amountVolatile, 4)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                            {formatNumber(point.lp.amountStable, 2)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums">
                            {formatNumber(point.lp.lpValue, 2)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                            {formatNumber(point.lp.cumulativeFees, 4)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                            {formatNumber(point.hedge.shortQuantity, 4)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums">
                            {formatSigned(point.hedge.unrealizedPnl + point.hedge.realizedPnl, 2)}
                          </td>
                          <td
                            className={
                              point.combinedPnl >= 0
                                ? "px-4 py-2 text-right font-mono font-medium tabular-nums text-profit"
                                : "px-4 py-2 text-right font-mono font-medium tabular-nums text-loss"
                            }
                          >
                            {formatSigned(point.combinedPnl, 2)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-muted">
                            {formatNumber(point.residualDelta, 4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader
          title="Model & assumptions"
          actions={<Badge variant="warn">Simplified hedge fees</Badge>}
        />
        <ul className="grid gap-2 px-4 py-4 text-sm text-muted sm:grid-cols-2">
          {[
            "Position math reuses the exact CLMM engine from the calculator — no duplicated model.",
            `Hedge target ratio applies to the LP's live volatile-side exposure (amountVolatile · price) at each path step; the default dynamic target is 75% (docs/04).`,
            "Fixed mode opens the short at the first step and holds it; dynamic/threshold modes rebalance toward the target with cooldown and minimum-size guards.",
            "Reductions use FIFO across tranches; tranches are never erased — realized PnL is booked per tranche (docs/04).",
            "Funding is modeled separately from price PnL and reported separately in every view.",
            "Rebalance costs (fee + slippage + optional fixed) are tracked separately and never folded into price PnL.",
            "Fee APR is a simplified flat model on in-range LP value — real CLMM fees depend on pool volume and position share; always labeled Simplified.",
            "Scenarios are what-if projections, not predictions (docs/06); read-only research — nothing connects a wallet or executes anything (docs/09).",
          ].map((note) => (
            <li key={note} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
              {note}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/** Compact inline PnL line chart (SVG) for the hedge path — presentation only. */
function MiniLineChart({ points, stable }: { points: ForwardScenarioResult["points"]; stable: string }) {
  if (points.length < 2) return null;
  const width = 640;
  const height = 180;
  const xs = points.map((p) => p.price);
  const ys = points.map((p) => [p.lp.lpPnl, p.hedge.unrealizedPnl + p.hedge.realizedPnl, p.combinedPnl]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(0, ...ys.flat());
  const yMax = Math.max(0, ...ys.flat());
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const toX = (price: number) => ((price - xMin) / xSpan) * width;
  const toY = (value: number) => height - ((value - yMin) / ySpan) * height;
  const paths: { key: string; stroke: string; values: number[] }[] = [
    { key: "LP PnL", stroke: "stroke-[color:var(--color-faint,#94a3b8)]", values: points.map((p) => p.lp.lpPnl) },
    { key: "Hedge PnL", stroke: "stroke-[color:var(--color-warn,#eab308)]", values: points.map((p) => p.hedge.unrealizedPnl + p.hedge.realizedPnl) },
    { key: "Combined PnL", stroke: "stroke-[color:var(--color-accent,#0ea5e9)]", values: points.map((p) => p.combinedPnl) },
  ];
  return (
    <svg
      role="img"
      aria-label={`Line chart of LP PnL, hedge PnL and combined PnL across the what-if price path in ${stable} units (scenario, not prediction)`}
      viewBox={`0 0 ${width} ${height}`}
      className="h-44 w-full"
      preserveAspectRatio="none"
    >
      <line x1={0} x2={width} y1={toY(0)} y2={toY(0)} stroke="currentColor" strokeDasharray="4 4" className="text-faint" />
      {paths.map((path) => (
        <polyline
          key={path.key}
          fill="none"
          strokeWidth={2}
          points={path.values.map((value, index) => `${toX(xs[index])},${toY(value)}`).join(" ")}
          className={path.stroke}
        />
      ))}
    </svg>
  );
}
