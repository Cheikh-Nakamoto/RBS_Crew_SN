/**
 * http-retry.ts
 *
 * Shared axios wrapper with automatic retry + exponential backoff.
 * Retries on: transient DNS errors (EAI_AGAIN, ENOTFOUND), timeouts
 * (ECONNABORTED, ETIMEDOUT), and 5xx server errors.
 */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Errors that are safe to retry (transient network / server issues)
const RETRYABLE_CODES = new Set([
  'EAI_AGAIN',      // DNS temporary failure
  'ENOTFOUND',      // DNS not found (also transient sometimes)
  'ECONNRESET',     // Connection reset
  'ECONNABORTED',   // Axios timeout
  'ETIMEDOUT',      // Socket timeout
  'ECONNREFUSED',   // Server momentarily unavailable
]);

function isRetryable(err: any): boolean {
  if (RETRYABLE_CODES.has(err?.code)) return true;
  const status: number | undefined = err?.response?.status;
  if (status && status >= 500) return true;  // 5xx server errors
  return false;
}

export interface RetryOptions {
  /** Maximum number of attempts (default 4 = 1 initial + 3 retries) */
  maxAttempts?: number;
  /** Base delay in ms for backoff (default 1000) */
  baseDelayMs?: number;
  /** Maximum delay cap in ms (default 15000) */
  maxDelayMs?: number;
}

/**
 * axios.get with automatic retry & exponential backoff.
 *
 * @example
 *   const { data } = await axiosGet(url, { auth: wpAuth }, { maxAttempts: 4 });
 */
export async function axiosGet<T = any>(
  url: string,
  config: AxiosRequestConfig = {},
  retry: RetryOptions = {},
): Promise<AxiosResponse<T>> {
  const maxAttempts = retry.maxAttempts ?? 4;
  const baseDelayMs = retry.baseDelayMs ?? 1000;
  const maxDelayMs  = retry.maxDelayMs  ?? 15_000;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await axios.get<T>(url, config);
    } catch (err: any) {
      lastError = err;

      const willRetry = attempt < maxAttempts && isRetryable(err);
      const label     = err?.code ?? err?.response?.status ?? 'UNKNOWN';

      if (!willRetry) {
        // Not retryable or out of attempts — rethrow
        throw err;
      }

      // Exponential backoff: 1s, 2s, 4s, … capped at maxDelayMs
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      console.warn(
        `⚠️  [http-retry] ${label} – tentative ${attempt}/${maxAttempts}, nouvel essai dans ${delay}ms…`,
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}
