# Mathematical Model & Documentation

## Overview
This calculator implements a Uniswap V3 style exact Concentrated Liquidity calculation engine coupled with a simple short hedge position manager.

## Price Convention
The price $P$ is explicitly defined as `USDC/SOL`.
$1 \text{ SOL} = \$100 \text{ USDC} \Rightarrow P = 100$

All math uses $\sqrt{P}$.

## Concentrated Liquidity Math

Let:
$P = \text{Current Price}$
$P_a = \text{Lower Bound}$
$P_b = \text{Upper Bound}$
$L = \text{Liquidity}$

### Solving for Liquidity $L$ at entry price $P_0$
Assuming initial capital $C$ is fully deposited into the CLMM.

If $P_a \leq P_0 \leq P_b$:
$$SOL\_amount_{1L} = \frac{\sqrt{P_b} - \sqrt{P_0}}{\sqrt{P_0} \sqrt{P_b}}$$
$$USDC\_amount_{1L} = \sqrt{P_0} - \sqrt{P_a}$$
$$V_{1L} = SOL\_amount_{1L} \cdot P_0 + USDC\_amount_{1L}$$
$$L = \frac{C}{V_{1L}}$$

### Token Amounts at Target Price $P$

**Case A: $P \leq P_a$ (Below Range)**
$$SOL\_amount = L \frac{\sqrt{P_b} - \sqrt{P_a}}{\sqrt{P_a} \sqrt{P_b}}$$
$$USDC\_amount = 0$$

**Case B: $P_a < P < P_b$ (In Range)**
$$SOL\_amount = L \frac{\sqrt{P_b} - \sqrt{P}}{\sqrt{P} \sqrt{P_b}}$$
$$USDC\_amount = L (\sqrt{P} - \sqrt{P_a})$$

**Case C: $P \geq P_b$ (Above Range)**
$$SOL\_amount = 0$$
$$USDC\_amount = L (\sqrt{P_b} - \sqrt{P_a})$$

## Impermanent Loss & HODL Benchmark

$V_{LP} = SOL\_amount \cdot P + USDC\_amount$
$V_{HODL} = SOL_{initial} \cdot P + USDC_{initial}$

$IL_{USD} = V_{LP} - V_{HODL}$
$IL_{\%} = \left( \frac{V_{LP}}{V_{HODL}} - 1 \right) \cdot 100$

## LP Delta
An approximate first-order delta to SOL is:
$\Delta_{LP} = SOL\_amount \cdot P$

## Short Hedge
$V_{Short} = \text{Short Notional USD}$
$PnL_{Short} = V_{Short} \frac{P_{entry} - P}{P_{entry}}$

Effective Hedge Ratio:
$HR_{effective} = \frac{V_{Short}}{V_{SOL\_Current}}$

Net Delta:
$\Delta_{Net} = \Delta_{LP} - V_{Short}$

## Limitations
1. Does not dynamically rebalance short hedges.
2. Does not incorporate exact concentrated liquidity fees over arbitrary volume distribution paths (uses manual simplified fees).
3. Precision is tied to Decimal.js configuration limits.
