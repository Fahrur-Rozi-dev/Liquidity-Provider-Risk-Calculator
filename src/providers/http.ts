/**
 * Minimal HTTP boundary for provider adapters (docs/06 Phase 3: the
 * cache/rate-limit/transport boundary lives here, never in domain code).
 * Read-only GETs only — no execution endpoints are ever wrapped
 * (docs/09-realtime-boundaries.md).
 */

/** Structural fetch subset so adapters and tests never depend on DOM globals. */
export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

export interface HttpResponse {
  status: number;
  text: string;
}

export interface HttpGetOptions {
  fetchImpl?: FetchLike;
  /** Abort the request after this many ms (default 15 000). */
  timeoutMs?: number;
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

/**
 * Read-only GET returning the raw body text. Throws HttpError on non-2xx;
 * fetch's own TypeError/AbortError propagates for network failures and
 * timeouts — adapters map those to typed provider errors.
 */
export async function httpGetText(url: string, options: HttpGetOptions = {}): Promise<HttpResponse> {
  const fetchImpl: FetchLike = options.fetchImpl ?? globalThis.fetch;
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
    return { status: response.status, text: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}
