/**
 * Raydium CLMM adapter — provider implementation (Phase 3, docs/06).
 *
 * Implements the shared read-only PoolDataProvider contract over the verified
 * public Raydium API v3 (mainnet). READ-ONLY: GETs only — the adapter exposes
 * no order/signing/liquidity methods (docs/09-realtime-boundaries.md).
 * Expected failures (network, HTTP, malformed payloads) never throw; they
 * surface as ProviderResult with provenance.error so the UI can show a
 * provider-error state instead of fabricated data (docs/07).
 *
 * Priority (docs/06): Raydium CLMM first; other providers only after the
 * contract is proven. Meteora DLMM is protocol-specific work and is NOT
 * modeled here as CLMM.
 */

import type { Pool, PoolSnapshot } from "@/types";
import {
  failedProvenance,
  providerErrorMessage,
} from "@/providers/data-quality";
import { HttpError, httpGetText, type FetchLike } from "@/providers/http";
import type { ProviderResult } from "@/providers/types";
import {
  parseRaydiumEnvelope,
  parseRaydiumPool,
  RAYDIUM_API_BASE_URL,
  type RaydiumPool,
} from "./api";
import { normalizeRaydiumPool, normalizeRaydiumSnapshot } from "./normalize";

export interface RaydiumPoolProviderOptions {
  /** Injectable transport for deterministic tests (defaults to global fetch). */
  fetchImpl?: FetchLike;
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

export class RaydiumPoolProvider {
  readonly id = "raydium-clmm";
  readonly label = "Raydium CLMM (public API v3)";

  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: RaydiumPoolProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? RAYDIUM_API_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  /**
   * Normalized CLMM pool discovery. Orientation is enforced: only pairs that
   * are canonically stable-per-volatile (recognized quote asset on side B)
   * are returned — everything else is rejected, never re-oriented silently.
   */
  async searchPools(query: { limit?: number } = {}): Promise<ProviderResult<Pool[]>> {
    const now = Date.now();
    const source = "raydium-api-v3";
    try {
      const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
      const response = await httpGetText(listUrl(this.baseUrl, limit), {
        fetchImpl: this.fetchImpl,
        timeoutMs: this.timeoutMs,
      });
      const envelope = parseRaydiumEnvelope<unknown>(response.text);
      if (!envelope) {
        return {
          data: null,
          provenance: failedProvenance(source, now, providerErrorMessage("validation", "Malformed response envelope.")),
        };
      }
      if (!envelope.success) {
        return {
          data: null,
          provenance: failedProvenance(
            source,
            now,
            providerErrorMessage("http", envelope.msg ?? "Provider reported failure."),
          ),
        };
      }
      const pools = parsePoolPayload(envelope.data)
        .map((raw) => normalizeRaydiumPool(raw))
        .filter((pool): pool is Pool => pool !== null)
        .slice(0, limit);
      return { data: pools, provenance: { source, fetchedAt: now, observedAt: null, freshness: "live", estimated: false } };
    } catch (error) {
      return { data: null, provenance: failedProvenance(source, now, describeFetchError(error)) };
    }
  }

  /** Fresh normalized snapshot for one pool id. */
  async getPoolSnapshot(poolId: string): Promise<ProviderResult<PoolSnapshot>> {
    const now = Date.now();
    const source = "raydium-api-v3";
    try {
      const response = await httpGetText(idsUrl(this.baseUrl, poolId), {
        fetchImpl: this.fetchImpl,
        timeoutMs: this.timeoutMs,
      });
      const envelope = parseRaydiumEnvelope<unknown>(response.text);
      if (!envelope) {
        return {
          data: null,
          provenance: failedProvenance(source, now, providerErrorMessage("validation", "Malformed response envelope.")),
        };
      }
      if (!envelope.success) {
        return {
          data: null,
          provenance: failedProvenance(
            source,
            now,
            providerErrorMessage("http", envelope.msg ?? "Provider reported failure."),
          ),
        };
      }
      const raw = parsePoolPayload(envelope.data).find((entry) => entry.id === poolId);
      if (!raw) {
        return {
          data: null,
          provenance: failedProvenance(source, now, providerErrorMessage("validation", `Pool ${poolId} not found.`)),
        };
      }
      const snapshot = normalizeRaydiumSnapshot(raw);
      if (!snapshot) {
        return {
          data: null,
          provenance: failedProvenance(
            source,
            now,
            providerErrorMessage("validation", `Pool ${poolId} cannot be oriented stable-per-volatile.`),
          ),
        };
      }
      return {
        data: snapshot,
        provenance: { source, fetchedAt: now, observedAt: null, freshness: "live", estimated: false },
      };
    } catch (error) {
      return { data: null, provenance: failedProvenance(source, now, describeFetchError(error)) };
    }
  }
}

/** Maps transport failures to the typed "[type] message" provenance format. */
export function describeFetchError(error: unknown): string {
  if (error instanceof HttpError) {
    return providerErrorMessage("http", error.message);
  }
  if (error instanceof Error && error.name === "AbortError") {
    return providerErrorMessage("network", "Request timed out.");
  }
  if (error instanceof TypeError) {
    return providerErrorMessage("network", error.message);
  }
  return providerErrorMessage("network", error instanceof Error ? error.message : "Unknown network failure.");
}
