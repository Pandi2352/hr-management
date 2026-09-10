/**
 * HTTP plumbing shared by every AI provider.
 *
 * Each provider had written its own copy of the same three things: an abort
 * controller for the timeout, a status check that turns a body into a readable
 * message, and a catch that decides whether "fetch failed" means the host is
 * down or the request simply took too long. Three copies means three slightly
 * different error messages for the same failure, and a new provider starts by
 * copying whichever one it happened to be sitting next to.
 *
 * Nothing here knows about any particular provider. The label passed in is only
 * used to write the message, so the operator reading a log line is told which
 * integration failed without this file having to know they exist.
 */

export interface JsonRequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs: number;
  /** Named in every error message this call can produce. */
  label: string;
}

/**
 * A failed provider call, carrying the HTTP status when there was one.
 *
 * The status matters upstream: a 401 is a configuration problem the operator
 * can fix, while a 503 is worth retrying. Losing it inside a string means the
 * caller has to parse prose to tell those apart.
 */
export class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly kind: 'timeout' | 'unreachable' | 'http' | 'malformed' = 'http',
  ) {
    super(message);
    this.name = 'ProviderHttpError';
  }
}

/**
 * Performs a JSON request with a hard timeout.
 *
 * `AbortController` rather than `AbortSignal.timeout` so the timer is always
 * cleared: a pending timeout keeps the event loop alive, which is invisible in
 * a long-running server and hangs the process in a test run.
 */
export async function requestJson<T>(url: string, options: JsonRequestOptions): Promise<T> {
  const { method = 'GET', headers = {}, body, timeoutMs, label } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      // The body usually explains the status far better than the status does.
      const detail = await response.text().catch(() => '');
      throw new ProviderHttpError(
        `${label} responded ${response.status}. ${detail.slice(0, 200)}`.trim(),
        response.status,
        'http',
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ProviderHttpError(`${label} returned a response that was not JSON.`, response.status, 'malformed');
    }
  } catch (err: unknown) {
    throw asProviderError(err, label, timeoutMs);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Turns whatever `fetch` threw into something an operator can act on.
 *
 * `fetch` reports a refused connection, a bad hostname and an aborted request
 * all as "fetch failed", which tells the person reading the log nothing. The
 * distinction is worth recovering: unreachable means check the host or the
 * network, timeout means the host answered too slowly.
 */
export function asProviderError(err: unknown, label: string, timeoutMs?: number): ProviderHttpError {
  if (err instanceof ProviderHttpError) return err;

  const message = err instanceof Error ? err.message : String(err);

  if (/abort/i.test(message) || (err as { name?: string })?.name === 'AbortError') {
    const after = timeoutMs ? ` after ${Math.round(timeoutMs / 1000)}s` : '';
    return new ProviderHttpError(`${label} timed out${after}.`, undefined, 'timeout');
  }

  if (/fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|network/i.test(message)) {
    return new ProviderHttpError(`Cannot reach ${label}. Check the host and your network.`, undefined, 'unreachable');
  }

  return new ProviderHttpError(message || `${label} request failed.`, undefined, 'http');
}

/** Trims a trailing slash so a path can be appended without doubling it. */
export function normalizeBaseUrl(url: string): string {
  return (url || '').trim().replace(/\/+$/, '');
}
