import { cn } from "@/utils/cn";
import { formatNumber } from "@/utils/format";

/**
 * Minimal SVG line chart for patterns (docs/03-design.md: charts illustrate,
 * tables carry exact values). Dependency-free, deterministic rendering.
 */

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartSeries {
  name: string;
  /** Tailwind stroke color class, e.g. "stroke-accent" */
  strokeClass: string;
  points: readonly ChartPoint[];
}

const WIDTH = 800;
const HEIGHT = 300;
const PAD = { top: 14, right: 18, bottom: 34, left: 64 };

function niceStep(range: number, targetTicks: number): number {
  const raw = range / targetTicks;
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

function ticksFor(min: number, max: number, targetTicks: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max - min <= 0) return [min];
  const step = niceStep(max - min, targetTicks);
  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let t = start; t <= max + step / 2; t += step) {
    ticks.push(Number(t.toPrecision(12)));
  }
  return ticks;
}

export function LineChart({
  series,
  xLabel,
  yLabel,
  includeZero = false,
  ariaLabel,
  tickDecimals = 0,
  className,
}: {
  series: readonly ChartSeries[];
  xLabel?: string;
  yLabel?: string;
  includeZero?: boolean;
  ariaLabel: string;
  tickDecimals?: number;
  className?: string;
}) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return null;

  const xs = all.map((p) => p.x);
  const ys = includeZero ? [...all.map((p) => p.y), 0] : all.map((p) => p.y);
  let xMin = Math.min(...xs);
  let xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (xMax === xMin) {
    xMin -= 1;
    xMax += 1;
  }
  if (yMax === yMin) {
    yMin -= 1;
    yMax += 1;
  }
  const yPad = (yMax - yMin) * 0.06;
  yMin -= yPad;
  yMax += yPad;

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin)) * (WIDTH - PAD.left - PAD.right);
  const sy = (y: number) =>
    HEIGHT - PAD.bottom - ((y - yMin) / (yMax - yMin)) * (HEIGHT - PAD.top - PAD.bottom);

  const xTicks = ticksFor(xMin, xMax, 5);
  const yTicks = ticksFor(yMin, yMax, 4);

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("h-auto w-full", className)}
    >
      {yTicks.map((t) => (
        <line
          key={`grid-y-${t}`}
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={sy(t)}
          y2={sy(t)}
          className="stroke-border"
          strokeWidth={1}
        />
      ))}
      {xTicks.map((t) => (
        <line
          key={`grid-x-${t}`}
          x1={sx(t)}
          x2={sx(t)}
          y1={PAD.top}
          y2={HEIGHT - PAD.bottom}
          className="stroke-border"
          strokeWidth={1}
        />
      ))}
      {includeZero && yMin < 0 && yMax > 0 ? (
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={sy(0)}
          y2={sy(0)}
          className="stroke-faint"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      ) : null}
      <line
        x1={PAD.left}
        x2={PAD.left}
        y1={PAD.top}
        y2={HEIGHT - PAD.bottom}
        className="stroke-border-strong"
        strokeWidth={1}
      />
      <line
        x1={PAD.left}
        x2={WIDTH - PAD.right}
        y1={HEIGHT - PAD.bottom}
        y2={HEIGHT - PAD.bottom}
        className="stroke-border-strong"
        strokeWidth={1}
      />
      {yTicks.map((t) => (
        <text
          key={`label-y-${t}`}
          x={PAD.left - 8}
          y={sy(t) + 3}
          textAnchor="end"
          fontSize={10}
          className="fill-faint font-mono"
        >
          {formatNumber(t, tickDecimals)}
        </text>
      ))}
      {xTicks.map((t) => (
        <text
          key={`label-x-${t}`}
          x={sx(t)}
          y={HEIGHT - PAD.bottom + 16}
          textAnchor="middle"
          fontSize={10}
          className="fill-faint font-mono"
        >
          {formatNumber(t, tickDecimals)}
        </text>
      ))}
      {series.map((s) => (
        <polyline
          key={s.name}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className={s.strokeClass}
          points={s.points.map((p) => `${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(" ")}
        />
      ))}
      {yLabel ? (
        <text x={PAD.left} y={12} fontSize={10} className="fill-faint">
          {yLabel}
        </text>
      ) : null}
      {xLabel ? (
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 6}
          textAnchor="end"
          fontSize={10}
          className="fill-faint"
        >
          {xLabel}
        </text>
      ) : null}
    </svg>
  );
}
