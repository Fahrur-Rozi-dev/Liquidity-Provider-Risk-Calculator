/**
 * Minimal transport boundary for provider adapters (docs/06 Phase 3: the
 * cache/rate-limit boundary lives here, never in domain code). Read-only GETs
 * only — no execution endpoints are ever wrapped (docs/09).
 *
 * Includes a tiny bounded TTL cache so repeat discovery calls within the
 * provider cache window reuse the response instead of re-fetching (docs/06
 * "cache/rate-limit boundary"). Deliberately NO retry logic: Raydium serves
 * cached data and the UI surfaces explicit provider errors — silent retries
 * would blur freshness (docs/05: never present stale as live).
 */

/** Structural fetch subset so adapters and tests never depend on DOM globals. */
export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

export interface HttpResponse {
  status: number;
  text: string;
  /** true when the response came from the bounded TTL cache. */
  fromCache: boolean;
}

export interface HttpGetOptions {
  fetchImpl?: FetchLike;
  /** Abort the request after this many ms (default 15 000). */
  timeoutMs?: number;
  /** Cache successful GETs for this many ms (default 60 000; 0 disables). */
  ttlMs?: number;
}

/** HTTP-level failure (non-2xx). Network failures surface as TypeError/AbortError. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

interface CacheEntry {
  text: string;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();
/** Module-level cache cap: enough for one adapter's working set; FIFO evicts beyond it. */
const MAX_CACHE_ENTRIES = 64;

/**
 * Read-only GET returning the raw body text, with bounded TTL caching.
 * Throws HttpError on non-2xx; fetch's own TypeError/AbortError propagates
 * for network failures and timeouts — adapters map those to typed errors.
 */
export async function httpGetText(url: string, options: HttpGetOptions = {}): Promise<HttpResponse> {
  const fetchImpl: FetchLike = options.fetchImpl ?? globalThis.fetch;
  const ttlMs = options.ttlMs ?? 60_000;

  const cached = ttlMs > 0 ? responseCache.get(url) : undefined;
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return { status: 200, text: cached.text, fromCache: true };
  }
  if (cached) {
    responseCache.delete(url);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new HttpError(response.status, `HTTP ${response.status} for ${url}`);
    }
    const text = await response.text();
    if (ttlMs > 0) {
      if (responseCache.size >= MAX_CACHE_ENTRIES) {
        const oldest = responseCache.keys().next().value;
        if (oldest !== undefined) responseCache.delete(oldest);
      }
      responseCache.set(url, { text, expiresAt: now + ttlMs });
    }
    return { status: response.status, text, fromCache: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Test helper: clears the module-level TTL cache. */
export function clearHttpCache(): void {
  responseCache.clear();
}
