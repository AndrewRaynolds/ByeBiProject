export type JsonSseEvent = Record<string, unknown>;

export class SseParseError extends Error {
  constructor(line: string) {
    super(`Evento SSE non valido: ${line.slice(0, 120)}`);
    this.name = "SseParseError";
  }
}

export class SseStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SseStreamError";
  }
}

interface ConsumeJsonSseOptions {
  onEvent: (event: JsonSseEvent) => void | Promise<void>;
}

export async function consumeJsonSse(
  response: Response,
  { onEvent }: ConsumeJsonSseOptions,
): Promise<void> {
  if (!response.body) {
    throw new SseStreamError("La risposta streaming non contiene dati");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processLine = async (rawLine: string): Promise<boolean> => {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line.startsWith("data:")) return false;

    const payload = line.slice(5).trimStart();
    if (!payload) return false;
    if (payload === "[DONE]") return true;

    let event: JsonSseEvent;
    try {
      event = JSON.parse(payload) as JsonSseEvent;
    } catch {
      throw new SseParseError(payload);
    }

    if (typeof event.error === "string" && event.error) {
      throw new SseStreamError(event.error);
    }

    await onEvent(event);
    return event.done === true;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (await processLine(line)) {
          await reader.cancel();
          return;
        }
        newlineIndex = buffer.indexOf("\n");
      }

      if (done) {
        if (buffer && (await processLine(buffer))) return;
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
