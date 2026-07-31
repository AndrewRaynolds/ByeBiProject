import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "./supabase";

const DEFAULT_API_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`La richiesta ha superato il limite di ${timeoutMs} ms`);
    this.name = "ApiTimeoutError";
  }
}

async function getErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await res.json().catch(() => null);
    if (body && typeof body === "object") {
      const message = (body as { error?: unknown; message?: unknown }).error ??
        (body as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return message.slice(0, 500);
      }
    }
  } else if (!contentType.includes("text/html")) {
    const text = await res.text().catch(() => "");
    if (text.trim()) return text.trim().slice(0, 500);
  }

  return res.statusText || "Richiesta non riuscita";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    throw new ApiError(res.status, await getErrorMessage(res));
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(init.signal?.reason);

  if (init.signal?.aborted) {
    abortFromCaller();
  } else {
    init.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new ApiTimeoutError(timeoutMs);
    throw error;
  } finally {
    window.clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
  }
  return {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const hasBody = data !== undefined;
  const res = await fetchWithTimeout(
    url,
    {
      method,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...authHeaders,
      },
      body: hasBody ? JSON.stringify(data) : undefined,
      signal: options.signal,
    },
    options.timeoutMs,
  );

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    const authHeaders = await getAuthHeaders();
    const res = await fetchWithTimeout(queryKey[0] as string, {
      headers: authHeaders,
      signal,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof ApiError) return error.status >= 500;
  if (error instanceof DOMException && error.name === "AbortError") return false;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 300000,
      retry: shouldRetryQuery,
      retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 2_000),
    },
    mutations: {
      retry: false,
    },
  },
});
