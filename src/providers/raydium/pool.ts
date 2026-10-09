/**
 * Raydium CLMM adapter — provider implementation (Phase 3, docs/06).
 *
 * Implements the shared read-only PoolDataProvider contract over the verified
 * public Raydium API v3 (mainnet). READ-ONLY: GETs only — the adapter exposes
 * no order/signing/liquidity methods (docs/09-realtime-boundaries.md).
 * Expected failures (network, HTTP, malformed payloads) never throw; they
 * surface as ProviderResult with quality.error so the UI can show a
 * provider-error state instead of fabricated data (docs/07).
 *
 * Priority (docs/06): Raydium CLMM first; other providers only after the
 * contract is proven. Meteora DLMM is protocol-specific work and is NOT
 * modeled here as CLMM.
 */

import type { PoolMetadata, PoolSnapshot } from "@/types";
import { errorQuality, okQuality, providerErrorMessage } from "@/providers/data-quality";
import { clearHttpCache, httpGetText, HttpError, type FetchLike } from "@/providers/http";
import type { PoolQuery, ProviderResult } from "@/providers/types";
import {
  parseRaydiumEnvelope,
  parseRaydiumPool,
  RAYDIUM_API_BASE_URL,
  type RaydiumPool,
} from "./api";
import { normalizeRaydiumMetadata, normalizeRaydiumSnapshot } from "./normalize";

export const RAYDIUM_SOURCE = "raydium-api-v3";

export interface RaydiumPoolProviderOptions {
  /** Injectable transport for deterministic tests (defaults to global fetch). */
  fetchImpl?: FetchLike;
  /** Bounded TTL cache window (docs/06 cache/rate-limit boundary). */
  ttlMs?: number;
  timeoutMs?: number;
  /** Overridable base URL (tests only). */
  baseUrl?: string;
}

function listUrl(baseUrl: string, limit: number): string {
  return `${baseUrl}/pools/info/list?poolType=concentrated&poolSortField=liquidity&sortType=desc&pageSize=${limit}&page=1`;
}

function idsUrl(baseUrl: string, poolId: string): string {
  return `${baseUrl}/pools/info/ids?ids=${encodeURIComponent(poolId)}`;
}

export class RaydiumPoolProvider {
  readonly id = "raydium-clmm";
  readonly label = "Raydium CLMM (public API v3)";

  private readonly baseUrl: string;
  private readonly fetchImpl?: FetchLike;
  private readonly ttlMs: number;
  private readonly timeoutMs: number;

  constructor(options: RaydiumPoolProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? RAYDIUM_API_BASE_URL;
    this.fetchImpl = options.fetchImpl;
    this.ttlMs = options.ttlMs ?? 60_000;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  private fetchOptions(): { fetchImpl?: FetchLike; timeoutMs: number; ttlMs: number } {
    return { fetchImpl: this.fetchImpl, timeoutMs: this.timeoutMs, ttlMs: this.ttlMs };
  }

  private fetchFailure(error: unknown): ProviderResult<never>["quality"] {
    const now = Date.now();
    if (error instanceof HttpError) {
      return errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("http", error.message));
    }
    if (error instanceof Error && error.name === "AbortError") {
      return errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("network", "Request timed out."));
    }
    if (error instanceof TypeError) {
      return errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("network", error.message));
    }
    return errorQuality(
      RAYDIUM_SOURCE,
      now,
      providerErrorMessage("network", error instanceof Error ? error.message : "Unknown network failure."),
    );
  }

  /** Fetches the pool entries for a URL; null quality data means failure. */
  private async fetchPools(url: string): Promise<ProviderResult<RaydiumPool[]>> {
    const now = Date.now();
    try {
      const response = await httpGetText(url, this.fetchOptions());
      const envelope = parseRaydiumEnvelope<unknown>(response.text);
      if (!envelope) {
        return {
          data: null,
          quality: errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("validation", "Malformed response envelope.")),
        };
      }
      if (!envelope.success) {
        return {
          data: null,
          quality: errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("http", envelope.msg ?? "Provider reported failure.")),
        };
      }
      const pools = parsePoolPayload(envelope.data);
      return {
        data: pools,
        quality: response.fromCache
          ? okQuality(RAYDIUM_SOURCE, now, ["Served from the bounded TTL cache (docs/06); underlying fetch is older."])
          : okQuality(RAYDIUM_SOURCE, now),
      };
    } catch (error) {
      return { data: null, quality: this.fetchFailure(error) };
    }
  }

  /**
   * Normalized CLMM pool discovery. Orientation is enforced: only pairs that
   * are canonically stable-per-volatile (recognized quote asset on side B)
   * are returned — everything else is rejected, never re-oriented silently.
   */
  async discoverPools(query: PoolQuery = {}): Promise<ProviderResult<PoolMetadata[]>> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const result = await this.fetchPools(listUrl(this.baseUrl, limit));
    if (result.data === null) return { data: null, quality: result.quality };
    const metadata = result.data
      .map((raw) => normalizeRaydiumMetadata(raw))
      .filter((entry): entry is PoolMetadata => entry !== null)
      .slice(0, limit);
    return { data: metadata, quality: result.quality };
  }

  /** Stable metadata for one pool by pool address. */
  async getPoolMetadata(poolKey: string): Promise<ProviderResult<PoolMetadata>> {
    const now = Date.now();
    try {
      const response = await httpGetText(idsUrl(this.baseUrl, poolKey), this.fetchOptions());
      const envelope = parseRaydiumEnvelope<unknown>(response.text);
      if (!envelope) {
        return {
          data: null,
          quality: errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("validation", "Malformed response envelope.")),
        };
      }
      if (!envelope.success) {
        return {
          data: null,
          quality: errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("http", envelope.msg ?? "Provider reported failure.")),
        };
      }
      const raw = parsePoolPayload(envelope.data).find((entry) => entry.id === poolKey);
      if (!raw) {
        return {
          data: null,
          quality: errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("validation", `Pool ${poolKey} not found.`)),
        };
      }
      const metadata = normalizeRaydiumMetadata(raw);
      if (!metadata) {
        return {
          data: null,
          quality: errorQuality(
            RAYDIUM_SOURCE,
            now,
            providerErrorMessage("validation", `Pool ${poolKey} cannot be oriented stable-per-volatile.`),
          ),
        };
      }
      return { data: metadata, quality: okQuality(RAYDIUM_SOURCE, now) };
    } catch (error) {
      return { data: null, quality: this.fetchFailure(error) };
    }
  }

  /** Fresh normalized snapshot for one pool by pool address. */
  async getPoolSnapshot(poolKey: string): Promise<ProviderResult<PoolSnapshot>> {
    const now = Date.now();
    try {
      const response = await httpGetText(idsUrl(this.baseUrl, poolKey), this.fetchOptions());
      const envelope = parseRaydiumEnvelope<unknown>(response.text);
      if (!envelope) {
        return {
          data: null,
          quality: errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("validation", "Malformed response envelope.")),
        };
      }
      if (!envelope.success) {
        return {
          data: null,
          quality: errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("http", envelope.msg ?? "Provider reported failure.")),
        };
      }
      const raw = parsePoolPayload(envelope.data).find((entry) => entry.id === poolKey);
      if (!raw) {
        return {
          data: null,
          quality: errorQuality(RAYDIUM_SOURCE, now, providerErrorMessage("validation", `Pool ${poolKey} not found.`)),
        };
      }
      const snapshot = normalizeRaydiumSnapshot(raw, now);
      if (!snapshot) {
        return {
          data: null,
          quality: errorQuality(
            RAYDIUM_SOURCE,
            now,
            providerErrorMessage("validation", `Pool ${poolKey} cannot be oriented stable-per-volatile.`),
          ),
        };
      }
      return { data: snapshot, quality: snapshot.quality };
    } catch (error) {
      return { data: null, quality: this.fetchFailure(error) };
    }
  }
}

/** Parses list/array payloads into raw pool entries, dropping invalid entries. */
function parsePoolPayload(payload: unknown): RaydiumPool[] {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => parseRaydiumPool(entry))
      .filter((entry): entry is RaydiumPool => entry !== null);
  }
  const record = payload as { data?: unknown } | null;
  if (record && Array.isArray(record.data)) {
    return record.data
      .map((entry) => parseRaydiumPool(entry))
      .filter((entry): entry is RaydiumPool => entry !== null);
  }
  return [];
}

export { clearHttpCache };
