export interface SafeErrorMetadata {
  name: string;
  status?: number;
}

export function getSafeErrorMetadata(error: unknown): SafeErrorMetadata {
  const name = error instanceof Error ? error.name : "UnknownError";
  if (!error || typeof error !== "object") return { name };

  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== "object") return { name };

  const status = (response as { status?: unknown }).status;
  return typeof status === "number" ? { name, status } : { name };
}

