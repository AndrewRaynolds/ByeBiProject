import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

// Three attempts stay below the frontend's 30-second request deadline.
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 250;

const RETRYABLE_NETWORK_CODES = new Set([
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNABORTED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
]);

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

export class AmadeusTemporaryError extends Error {
  readonly code = "AMADEUS_TEMPORARY_UNAVAILABLE";

  constructor(cause: unknown) {
    super("Amadeus is temporarily unavailable", { cause });
    this.name = "AmadeusTemporaryError";
  }
}

export function isRetryableAmadeusError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;

  if (error.code && RETRYABLE_NETWORK_CODES.has(error.code)) {
    return true;
  }

  return error.response
    ? RETRYABLE_HTTP_STATUSES.has(error.response.status)
    : false;
}

const sleep = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export async function withAmadeusRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    wait?: (delayMs: number) => Promise<void>;
  } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const wait = options.wait ?? sleep;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;

      if (!isRetryableAmadeusError(error)) {
        throw error;
      }

      if (attempt < maxAttempts) {
        await wait(baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }

  throw new AmadeusTemporaryError(lastError);
}

function withTimeout(config: AxiosRequestConfig): AxiosRequestConfig {
  return {
    timeout: DEFAULT_TIMEOUT_MS,
    ...config,
  };
}

export function amadeusGet<T = unknown>(
  url: string,
  config: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> {
  return withAmadeusRetry(() => axios.get<T>(url, withTimeout(config)));
}

export function amadeusTokenPost<T = unknown>(
  url: string,
  body: URLSearchParams,
  config: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> {
  return withAmadeusRetry(() => axios.post<T>(url, body, withTimeout(config)));
}

// Booking creation must never be retried automatically: a retry could create
// a duplicate reservation after an ambiguous timeout.
export function amadeusBookingPost<T = unknown>(
  url: string,
  body: unknown,
  config: AxiosRequestConfig = {},
): Promise<AxiosResponse<T>> {
  return axios.post<T>(url, body, withTimeout(config));
}
