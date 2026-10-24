import { describe, expect, it, vi } from "vitest";
import {
  SseParseError,
  SseStreamError,
  consumeJsonSse,
} from "./sse";

function streamingResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}

describe("consumeJsonSse", () => {
  it("reassembles JSON split across network chunks", async () => {
    const onEvent = vi.fn();
    const response = streamingResponse([
      'data: {"cont',
      'ent":"Ciao"}\r\n',
      'data: {"content":" mondo"}\n',
      'data: {"done":true}\n',
    ]);

    await consumeJsonSse(response, { onEvent });

    expect(onEvent).toHaveBeenNthCalledWith(1, { content: "Ciao" });
    expect(onEvent).toHaveBeenNthCalledWith(2, { content: " mondo" });
    expect(onEvent).toHaveBeenNthCalledWith(3, { done: true });
  });

  it("supports the standard DONE marker and ignores later events", async () => {
    const onEvent = vi.fn();
    const response = streamingResponse([
      'data: {"content":"prima"}\n',
      "data: [DONE]\n",
      'data: {"content":"dopo"}\n',
    ]);

    await consumeJsonSse(response, { onEvent });

    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed JSON instead of silently losing content", async () => {
    await expect(
      consumeJsonSse(streamingResponse(["data: {invalid}\n"]), {
        onEvent: vi.fn(),
      }),
    ).rejects.toBeInstanceOf(SseParseError);
  });

  it("propagates errors sent by the server", async () => {
    await expect(
      consumeJsonSse(
        streamingResponse(['data: {"error":"Servizio non disponibile"}\n']),
        { onEvent: vi.fn() },
      ),
    ).rejects.toEqual(
      expect.objectContaining<SseStreamError>({
        name: "SseStreamError",
        message: "Servizio non disponibile",
      }),
    );
  });
});


describe("SSE cancellation after response headers", () => {
  it("cancels a stalled body and releases the reader when the caller aborts", async () => {
    const controller = new AbortController();
    const cancel = vi.fn();
    const body = new ReadableStream({ cancel });
    const onEvent = vi.fn();
    const pending = consumeJsonSse(new Response(body), { onEvent, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(body.locked).toBe(false);
    expect(onEvent).not.toHaveBeenCalled();
  });
  it("rejects a pre-aborted body without delivering buffered events", async () => {
    const controller = new AbortController(); controller.abort();
    const onEvent = vi.fn();
    await expect(consumeJsonSse(streamingResponse(['data: {"content":"stale"}\n']), { onEvent, signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(onEvent).not.toHaveBeenCalled();
  });
});
