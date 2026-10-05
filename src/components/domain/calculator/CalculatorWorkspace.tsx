"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { NumberField, SelectField, TextField } from "@/components/ui/fields";
import type { LPPositionConfig } from "@/domain/lp";
import type { CLMMConfig } from "@/domain/clmm";
import type { HedgeConfig } from "@/domain/hedge";
import { computeClmmScenarios, computeScenarios } from "@/services/calculator";
import { linspace } from "@/utils/array";

import { ClmmResultView } from "./ClmmResultView";
import { SimplifiedResultView } from "./SimplifiedResultView";

/**
 * Calculator workspace (docs/06-roadmap.md Phases 1–2, docs/03-design.md).
 *
 * Phase 2 ADDS the exact CLMM model next to the Phase 1 simplified model;
 * neither replaces the other (docs/07: do not delete earlier functionality).
 * All math lives in domain engines and services — this component only parses
 * input, renders, and formats.
 */

type ModelId = "exact-clmm" | "simplified";

interface FormState {
  model: ModelId;
  volatileSymbol: string;
  stableSymbol: string;
  entryPrice: string;
  initialValue: string;
  lowerPrice: string;
  upperPrice: string;
  hedgeMode: "none" | "fixed";
  hedgeRatio: string;
  scenarioMin: string;
  scenarioMax: string;
  scenarioSteps: string;
}

const INITIAL_FORM: FormState = {
  model: "exact-clmm",
  volatileSymbol: "SOL",
  stableSymbol: "USDC",
  entryPrice: "150",
  initialValue: "3000",
  lowerPrice: "100",
  upperPrice: "225",
  hedgeMode: "fixed",
  hedgeRatio: "50",
  scenarioMin: "75",
  scenarioMax: "225",
  scenarioSteps: "61",
};

interface ParsedConfig {
  lp: LPPositionConfig;
  clmm: CLMMConfig;
  hedge: HedgeConfig;
  prices: number[];
}

type Parsed =
  | { ok: true; config: ParsedConfig }
  | { ok: false; errors: string[] };

function parseForm(form: FormState): Parsed {
  const errors: string[] = [];

  const volatileSymbol = form.volatileSymbol.trim();
  const stableSymbol = form.stableSymbol.trim();
  if (!volatileSymbol) errors.push("Volatile token symbol is required.");
  if (!stableSymbol) errors.push("Stable token symbol is required.");

  const entryPrice = Number(form.entryPrice);
  const initialValue = Number(form.initialValue);
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    errors.push("Entry price must be a positive number.");
  }
  if (!Number.isFinite(initialValue) || initialValue <= 0) {
    errors.push("Initial LP value must be a positive number.");
  }

  // Price range — used by the exact CLMM model.
  const lowerPrice = Number(form.lowerPrice);
  const upperPrice = Number(form.upperPrice);
  if (!Number.isFinite(lowerPrice) || lowerPrice <= 0) {
    errors.push("Lower price must be a positive number.");
  }
  if (!Number.isFinite(upperPrice) || upperPrice <= 0) {
    errors.push("Upper price must be a positive number.");
  }
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

  const ratioPct = Number(form.hedgeRatio);
  if (!Number.isFinite(ratioPct) || ratioPct < 0 || ratioPct > 100) {
    errors.push("Hedge ratio must be between 0 and 100.");
  }

  const minPrice = Number(form.scenarioMin);
  const maxPrice = Number(form.scenarioMax);
  const steps = Number(form.scenarioSteps);
  if (!Number.isFinite(minPrice) || minPrice <= 0) {
    errors.push("Scenario minimum price must be a positive number.");
  }
  if (!Number.isFinite(maxPrice) || maxPrice <= 0) {
    errors.push("Scenario maximum price must be a positive number.");
  }
  if (Number.isFinite(minPrice) && Number.isFinite(maxPrice) && maxPrice < minPrice) {
    errors.push("Scenario maximum price must be greater than or equal to the minimum.");
  }
  if (!Number.isInteger(steps) || steps < 2 || steps > 501) {
    errors.push("Scenario steps must be an integer between 2 and 501.");
  }

  if (errors.length > 0) return { ok: false, errors };

  const lp: LPPositionConfig = { entryPrice, initialValueStable: initialValue };
  const clmm: CLMMConfig = {
    entryPrice,
    lowerPrice,
    upperPrice,
    initialValueStable: initialValue,
  };
  const hedge: HedgeConfig = { mode: form.hedgeMode, ratio: ratioPct / 100 };
  return { ok: true, config: { lp, clmm, hedge, prices: linspace(minPrice, maxPrice, steps) } };
}

export function CalculatorWorkspace() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const parsed = useMemo(() => parseForm(form), [form]);

  const simplified = useMemo(
    () => (parsed.ok ? computeScenarios(parsed.config.lp, parsed.config.hedge, parsed.config.prices) : null),
    [parsed],
  );
  const exact = useMemo(
    () => (parsed.ok ? computeClmmScenarios(parsed.config.clmm, parsed.config.hedge, parsed.config.prices) : null),
    [parsed],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const stable = form.stableSymbol.trim() || "stable";
  const volatile = form.volatileSymbol.trim() || "volatile";
  const showExact = form.model === "exact-clmm" ? exact : null;
  const showSimplified = form.model === "simplified" ? simplified : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Input area — groups per docs/03-design.md (costs/fees group arrives in Phase 3) */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Model" />
            <div className="px-4 py-4">
              <SelectField
                id="model"
                label="LP model"
                value={form.model}
                onChange={(v) => set("model", v)}
                options={[
                  { value: "exact-clmm", label: "Exact CLMM (Phase 2)" },
                  { value: "simplified", label: "Simplified 50/50 (Phase 1)" },
                ]}
              />
              <p className="mt-2 text-[11px] leading-snug text-faint">
                {form.model === "exact-clmm"
                  ? "Uniswap-v3-style concentrated liquidity math — labeled Exact."
                  : "Constant-product 50/50 estimate — labeled Simplified model."}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pool / Pair" />
            <div className="grid grid-cols-2 gap-3 px-4 py-4">
              <TextField
                id="volatileSymbol"
                label="Volatile token"
                value={form.volatileSymbol}
                onChange={(v) => set("volatileSymbol", v)}
                placeholder="SOL"
              />
              <TextField
                id="stableSymbol"
                label="Stable token"
                value={form.stableSymbol}
                onChange={(v) => set("stableSymbol", v)}
                placeholder="USDC"
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Position" />
            <div className="space-y-3 px-4 py-4">
              <NumberField
                id="entryPrice"
                label="Entry price"
                unit={`${stable} per 1 ${volatile}`}
                value={form.entryPrice}
                onChange={(v) => set("entryPrice", v)}
              />
              <NumberField
                id="initialValue"
                label="Initial LP value"
                unit={stable}
                value={form.initialValue}
                onChange={(v) => set("initialValue", v)}
                hint={
                  form.model === "exact-clmm"
                    ? "Converted to exact position liquidity L at entry."
                    : "Split 50/50 between the two tokens at entry (simplified model)."
                }
              />
            </div>
          </Card>

          {form.model === "exact-clmm" ? (
            <Card>
              <CardHeader title="Price Range" />
              <div className="grid grid-cols-2 gap-3 px-4 py-4">
                <NumberField
                  id="lowerPrice"
                  label="Lower price"
                  unit={stable}
                  value={form.lowerPrice}
                  onChange={(v) => set("lowerPrice", v)}
                />
                <NumberField
                  id="upperPrice"
                  label="Upper price"
                  unit={stable}
                  value={form.upperPrice}
                  onChange={(v) => set("upperPrice", v)}
                />
                <p className="col-span-2 text-[11px] leading-snug text-faint">
                  Entry must be inside the range. Outside it the position holds
                  only one token — scenario prices beyond the range are allowed.
                </p>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Hedge" actions={<Badge variant="muted">Fixed short</Badge>} />
            <div className="space-y-3 px-4 py-4">
              <SelectField
                id="hedgeMode"
                label="Mode"
                value={form.hedgeMode}
                onChange={(v) => set("hedgeMode", v)}
                options={[
                  { value: "none", label: "No hedge" },
                  { value: "fixed", label: "Fixed short at entry" },
                ]}
              />
              {form.hedgeMode === "fixed" ? (
                <NumberField
                  id="hedgeRatio"
                  label="Hedge ratio"
                  unit="% of volatile-side exposure"
                  value={form.hedgeRatio}
                  onChange={(v) => set("hedgeRatio", v)}
                  hint="Short quantity is fixed at entry. Funding and rebalancing arrive in Phase 3."
                />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Scenario" />
            <div className="grid grid-cols-2 gap-3 px-4 py-4">
              <NumberField
                id="scenarioMin"
                label="Min price"
                unit={stable}
                value={form.scenarioMin}
                onChange={(v) => set("scenarioMin", v)}
              />
              <NumberField
                id="scenarioMax"
                label="Max price"
                unit={stable}
                value={form.scenarioMax}
                onChange={(v) => set("scenarioMax", v)}
              />
              <NumberField
                id="scenarioSteps"
                label="Steps"
                unit="2–501"
                value={form.scenarioSteps}
                onChange={(v) => set("scenarioSteps", v)}
                className="col-span-2"
              />
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {!parsed.ok ? (
            <EmptyState title="Fix the inputs to see scenario results">
              <ul className="list-inside list-disc space-y-1 text-left text-sm text-muted">
                {parsed.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </EmptyState>
          ) : showExact ? (
            <ClmmResultView
              scenario={showExact}
              clmm={parsed.config.clmm}
              stable={stable}
              volatile={volatile}
            />
          ) : showSimplified ? (
            <SimplifiedResultView
              scenario={showSimplified}
              stable={stable}
              volatile={volatile}
            />
          ) : null}
        </div>
      </div>

      {/* Model & assumptions — always visible, never hidden (docs/03, docs/04) */}
      <Card>
        <CardHeader
          title="Model & assumptions"
          actions={
            <Badge variant={form.model === "exact-clmm" ? "profit" : "warn"}>
              {form.model === "exact-clmm" ? "Exact" : "Simplified model"}
            </Badge>
          }
        />
        <ul className="grid gap-2 px-4 py-4 text-sm text-muted sm:grid-cols-2">
          {(form.model === "exact-clmm"
            ? [
                "Exact Uniswap-v3-style CLMM math: L derived from the initial value at an in-range entry; amounts from the docs formulas with explicit token ordering.",
                "Below the range the position is pure volatile; above it, pure stable; value is continuous at both boundaries.",
                "HODL benchmark values the initial token quantities at each scenario price; IL = LP value − HODL value (≤ 0 without fees).",
                "Delta = d(LP value)/dP in volatile units: amount0 below the range, L·(1/√P − 1/√Pb) in range, 0 above. Net delta = LP delta − short quantity.",
                `Hedge: fixed short sized at entry from the volatile-side exposure; PnL = q · (P0 − P). No funding or rebalance costs yet (Phase 3).`,
                `All values in ${stable} units; price convention: ${stable} per 1 ${volatile}. Read-only research tool — nothing here connects a wallet or executes anything.`,
              ]
            : [
                `Constant-product 50/50 pool (x·y = k); LP value V(P) = V0 · √(P / P0).`,
                `Hedge: fixed short opened at entry on the volatile-side exposure; PnL = q · (P0 − P).`,
                `Not modeled yet: pool fees, funding, rebalance costs, margin — Phase 3 and later.`,
                `The exact CLMM model (price ranges, HODL, IL, delta, range status) is available via the model selector — Phase 2.`,
                `All values in ${stable} units; price convention: ${stable} per 1 ${volatile}.`,
                `Read-only research tool — nothing here connects a wallet or executes anything.`,
              ]
          ).map((note) => (
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
