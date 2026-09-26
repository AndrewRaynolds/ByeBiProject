import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import { AmadeusConfigurationError } from "./amadeusConfig";

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

export type SafeAmadeusErrorMetadata = {
  name: string;
  status?: number;
  networkCode?: string;
  apiCode?: number | string;
  apiTitle?: string;
  configurationCode?: "AMADEUS_CREDENTIALS_MISSING";
};

export function getSafeAmadeusErrorMetadata(error: unknown): SafeAmadeusErrorMetadata {
  const source = error instanceof AmadeusTemporaryError ? error.cause : error;
  const name = error instanceof Error ? error.name : "UnknownError";

  if (source instanceof AmadeusConfigurationError) {
    return { name, configurationCode: source.code };
  }

  if (!axios.isAxiosError(source)) return { name };

  const metadata: SafeAmadeusErrorMetadata = { name };
  if (typeof source.response?.status === "number") metadata.status = source.response.status;
  if (source.code) metadata.networkCode = source.code;

  const data = source.response?.data as { errors?: Array<{ code?: unknown; title?: unknown }> } | undefined;
  const first = data?.errors?.[0];
  if (typeof first?.code === "number" || typeof first?.code === "string") {
    metadata.apiCode = first.code;
  }
  if (typeof first?.title === "string" && first.title.trim()) {
    metadata.apiTitle = first.title.trim().slice(0, 160);
  }

  return metadata;
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
