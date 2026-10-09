/**
 * Deterministic fixture pool provider (Phase 3, docs/06 "deterministic fixture
 * provider using the same contracts").
 *
 * Implements the SAME PoolDataProvider interface as the production Raydium
 * adapter and flows its raw entries through the SAME normalization path —
 * one data contract, one calculation path, no parallel model (docs/06, docs/12).
 * Used for offline development and deterministic tests. Contains no
 * calculation logic.
 *
 * Quality is intentionally "unavailable": fixtures are not realtime
 * observations and must never present themselves as live (docs/09, docs/05).
 */

import type { PoolMetadata, PoolSnapshot } from "@/types";
import { errorQuality, providerErrorMessage, unavailableQuality } from "@/providers/data-quality";
import type { ProviderResult } from "@/providers/types";
import type { RaydiumPool } from "@/providers/raydium/api";
import {
  normalizeRaydiumMetadata,
  normalizeRaydiumSnapshot,
} from "@/providers/raydium/normalize";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUP_MINT = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

function mint(
  address: string,
  symbol: string,
  name: string,
  decimals: number,
): RaydiumPool["mintA"] {
  return { address, symbol, name, decimals, chainId: 101 };
}

/** Raw entries in the exact shape the Raydium API serves, for one normalization path. */
const FIXTURE_RAW_POOLS: readonly RaydiumPool[] = [
  {
    id: "fixture-sol-usdc",
    type: "Concentrated",
    programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    mintA: mint(SOL_MINT, "SOL", "Solana", 9),
    mintB: mint(USDC_MINT, "USDC", "USD Coin", 6),
    price: 150.25,
    feeRate: 0.0025,
    tvl: 82_400_000,
    mintAmountA: 190_000,
    mintAmountB: 41_600_000,
    day: { volume: 45_200_000, volumeFee: 113_000, feeApr: 0.05 },
    config: { tickSpacing: 60 },
  },
  {
    id: "fixture-jup-usdc",
    type: "Concentrated",
    programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    mintA: mint(JUP_MINT, "JUP", "Jupiter", 6),
    mintB: mint(USDC_MINT, "USDC", "USD Coin", 6),
    price: 0.812,
    feeRate: 0.001,
    tvl: 12_800_000,
    mintAmountA: 9_600_000,
    mintAmountB: 8_900_000,
    day: { volume: 3_100_000, volumeFee: 3_100, feeApr: 0.088 },
    config: { tickSpacing: 60 },
  },
  {
    id: "fixture-bonk-usdc",
    type: "Concentrated",
    programId: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    mintA: mint(BONK_MINT, "BONK", "Bonk", 5),
    mintB: mint(USDC_MINT, "USDC", "USD Coin", 6),
    price: 0.0000215,
    feeRate: 0.0001,
    tvl: 9_600_000,
    mintAmountA: 148_000_000_000_000,
    mintAmountB: 3_600_000,
    day: { volume: 12_400_000, volumeFee: 1_240, feeApr: 0.047 },
    config: { tickSpacing: 20 },
  },
];

const FIXTURE_WARNING = "Deterministic fixture data — not a realtime observation; values are static.";

function fixtureQuality(source: string): ProviderResult<never>["quality"] {
  return unavailableQuality(source, FIXTURE_WARNING);
}

function fixtureError(source: string, now: number, message: string): ProviderResult<never>["quality"] {
  return { ...errorQuality(source, now, message), warnings: [FIXTURE_WARNING] };
}

export class FixturePoolProvider {
  readonly id = "fixture";
  readonly label = "Deterministic fixture (offline)";

  private normalizeAll(): PoolMetadata[] {
    return FIXTURE_RAW_POOLS.map((raw) => normalizeRaydiumMetadata(raw)).filter(
      (entry): entry is PoolMetadata => entry !== null,
    );
  }

  async discoverPools(): Promise<ProviderResult<PoolMetadata[]>> {
    const now = Date.now();
    const normalized = this.normalizeAll();
    if (normalized.length !== FIXTURE_RAW_POOLS.length) {
      // A fixture failing canonical normalization is a developer error, not a data error.
      return {
        data: null,
        quality: fixtureError(
          "fixture",
          now,
          providerErrorMessage("validation", "Fixture entry failed canonical normalization."),
        ),
      };
    }
    return { data: normalized, quality: fixtureQuality("fixture") };
  }

  async getPoolMetadata(poolKey: string): Promise<ProviderResult<PoolMetadata>> {
    const now = Date.now();
    const metadata = this.normalizeAll().find((entry) => entry.key === poolKey);
    if (!metadata) {
      return {
        data: null,
        quality: fixtureError("fixture", now, providerErrorMessage("validation", `Pool ${poolKey} not found in fixtures.`)),
      };
    }
    return { data: metadata, quality: fixtureQuality("fixture") };
  }

  async getPoolSnapshot(poolKey: string): Promise<ProviderResult<PoolSnapshot>> {
    const now = Date.now();
    const raw = FIXTURE_RAW_POOLS.find((entry) => entry.id === poolKey);
    if (!raw) {
      return {
        data: null,
        quality: fixtureError("fixture", now, providerErrorMessage("validation", `Pool ${poolKey} not found in fixtures.`)),
      };
    }
    const snapshot = normalizeRaydiumSnapshot(raw, now);
    if (!snapshot) {
      return {
        data: null,
        quality: fixtureError("fixture", now, providerErrorMessage("validation", `Pool ${poolKey} failed canonical normalization.`)),
      };
    }
    // Fixtures are not realtime observations: snapshot quality stays "unavailable".
    return { data: { ...snapshot, quality: fixtureQuality("fixture") }, quality: fixtureQuality("fixture") };
  }
}
