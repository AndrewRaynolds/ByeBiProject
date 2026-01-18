import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StreamChunk } from './openai';

// Mock OpenAI module with a proper class
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate
        }
      };
    }
  };
});

// Mock amadeus-flights
vi.mock('./amadeus-flights', () => ({
  searchFlights: vi.fn().mockResolvedValue([
    {
      id: '1',
      price: 89,
      currency: 'EUR',
      outbound: [{
        departure: { iataCode: 'ROM', at: '2025-06-15T10:00:00' },
        arrival: { iataCode: 'BCN', at: '2025-06-15T12:30:00' },
        carrierCode: 'VY',
        carrierName: 'Vueling',
        flightNumber: '456',
        duration: 'PT2H30M'
      }],
      inbound: [{
        departure: { iataCode: 'BCN', at: '2025-06-20T18:00:00' },
        arrival: { iataCode: 'ROM', at: '2025-06-20T20:30:00' },
        carrierCode: 'VY',
        carrierName: 'Vueling',
        flightNumber: '789',
        duration: 'PT2H30M'
      }],
      airlines: ['Vueling'],
      totalDuration: 'PT2H30M',
      stops: 0
    }
  ])
}));

// Mock cityMapping
vi.mock('./cityMapping', () => ({
  cityToIata: vi.fn((city: string) => {
    const mapping: Record<string, string> = {
      'Rome': 'ROM',
      'Barcelona': 'BCN'
    };
    return mapping[city] || null;
  }),
  iataToCity: vi.fn((iata: string) => {
    const mapping: Record<string, string> = {
      'ROM': 'Rome',
      'BCN': 'Barcelona'
    };
    return mapping[iata] || null;
  })
}));

// Helper to create mock async iterator for streaming
function createMockStream(events: Array<{
  content?: string;
  tool_call?: { id: string; name: string; arguments: string };
  finish?: string;
}>) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const event of events) {
        if (event.content) {
          yield {
            choices: [{
              delta: { content: event.content },
              finish_reason: null
            }]
          };
        }
        if (event.tool_call) {
          yield {
            choices: [{
              delta: {
                tool_calls: [{
                  index: 0,
                  id: event.tool_call.id,
                  function: {
                    name: event.tool_call.name,
                    arguments: event.tool_call.arguments
                  }
                }]
              },
              finish_reason: null
            }]
          };
        }
        if (event.finish) {
          yield {
            choices: [{
              delta: {},
              finish_reason: event.finish
            }]
          };
        }
      }
    }
  };
}

describe('streamOpenAIChatCompletionWithTools integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('streams content without tool calls', async () => {
    // Import fresh after mocks are set
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');

    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'Hello! ' },
      { content: 'How can I help you today?' },
      { finish: 'stop' }
    ]));

    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools('Hi', {}, [])) {
      chunks.push(chunk);
    }

    expect(mockCreate).toHaveBeenCalledTimes(1);

    const contentChunks = chunks.filter(c => c.type === 'content');
    expect(contentChunks).toHaveLength(2);

    const fullContent = contentChunks.map(c => (c as any).content).join('');
    expect(fullContent).toBe('Hello! How can I help you today?');
  });

  it('handles single tool call and continues conversation', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');

    // First call: model returns tool call for set_destination
    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'Barcelona sounds great! ' },
      {
        tool_call: {
          id: 'call_123',
          name: 'set_destination',
          arguments: '{"city":"Barcelona"}'
        }
      },
      { finish: 'tool_calls' }
    ]));

    // Second call: model responds naturally after receiving tool result
    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'When would you like to travel?' },
      { finish: 'stop' }
    ]));

    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools(
      'I want to go to Barcelona',
      {},
      []
    )) {
      chunks.push(chunk);
    }

    // Verify OpenAI was called twice (initial + after tool result)
    expect(mockCreate).toHaveBeenCalledTimes(2);

    // Verify tool call was emitted
    const toolCallChunks = chunks.filter(c => c.type === 'tool_call');
    expect(toolCallChunks).toHaveLength(1);
    expect((toolCallChunks[0] as any).toolCall.name).toBe('set_destination');

    // Verify tool result was emitted
    const toolResultChunks = chunks.filter(c => c.type === 'tool_result');
    expect(toolResultChunks).toHaveLength(1);
    expect((toolResultChunks[0] as any).name).toBe('set_destination');
    expect((toolResultChunks[0] as any).result).toEqual({ success: true, destination: 'Barcelona' });

    // Verify final content includes follow-up question
    const contentChunks = chunks.filter(c => c.type === 'content');
    const fullContent = contentChunks.map(c => (c as any).content).join('');
    expect(fullContent).toContain('Barcelona');
    expect(fullContent).toContain('travel');
  });

  it('handles search_flights tool with API call', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');

    // First call: model calls search_flights
    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'Let me search for flights... ' },
      {
        tool_call: {
          id: 'call_456',
          name: 'search_flights',
          arguments: JSON.stringify({
            origin: 'Rome',
            destination: 'Barcelona',
            departure_date: '2025-06-15',
            return_date: '2025-06-20',
            passengers: 2
          })
        }
      },
      { finish: 'tool_calls' }
    ]));

    // Second call: model presents flight options
    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'I found a great flight with Vueling!' },
      { finish: 'stop' }
    ]));

    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools(
      'Find flights from Rome to Barcelona June 15-20 for 2 people',
      { selectedDestination: 'Barcelona' },
      []
    )) {
      chunks.push(chunk);
    }

    // Verify tool result contains flight data
    const toolResultChunks = chunks.filter(c => c.type === 'tool_result');
    expect(toolResultChunks).toHaveLength(1);

    const flightResult = (toolResultChunks[0] as any).result;
    expect(flightResult.flights).toBeDefined();
    expect(flightResult.flights.length).toBeGreaterThan(0);
    expect(flightResult.flights[0].airline).toBe('Vueling');
  });

  it('handles multiple tool calls in sequence', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');

    // First call: set_destination
    mockCreate.mockResolvedValueOnce(createMockStream([
      {
        tool_call: {
          id: 'call_1',
          name: 'set_destination',
          arguments: '{"city":"Barcelona"}'
        }
      },
      { finish: 'tool_calls' }
    ]));

    // Second call: set_origin
    mockCreate.mockResolvedValueOnce(createMockStream([
      {
        tool_call: {
          id: 'call_2',
          name: 'set_origin',
          arguments: '{"city":"Rome"}'
        }
      },
      { finish: 'tool_calls' }
    ]));

    // Third call: final response
    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'When are you planning to travel?' },
      { finish: 'stop' }
    ]));

    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools(
      'I want to fly from Rome to Barcelona',
      {},
      []
    )) {
      chunks.push(chunk);
    }

    // Verify OpenAI was called 3 times
    expect(mockCreate).toHaveBeenCalledTimes(3);

    // Verify both tool calls were emitted
    const toolCallChunks = chunks.filter(c => c.type === 'tool_call');
    expect(toolCallChunks).toHaveLength(2);
    expect((toolCallChunks[0] as any).toolCall.name).toBe('set_destination');
    expect((toolCallChunks[1] as any).toolCall.name).toBe('set_origin');
  });

  it('stops loop when no tool calls are returned', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');

    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'I can help you plan a trip. Where would you like to go?' },
      { finish: 'stop' }
    ]));

    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools('Help me plan a trip', {}, [])) {
      chunks.push(chunk);
    }

    // Should only call OpenAI once since no tools were invoked
    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Should not have any tool calls
    const toolCallChunks = chunks.filter(c => c.type === 'tool_call');
    expect(toolCallChunks).toHaveLength(0);
  });

  it('handles unlock_checkout tool', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');

    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'Taking you to checkout now! ' },
      {
        tool_call: {
          id: 'call_checkout',
          name: 'unlock_checkout',
          arguments: '{}'
        }
      },
      { finish: 'tool_calls' }
    ]));

    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'Your checkout is ready!' },
      { finish: 'stop' }
    ]));

    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools(
      'Yes, proceed to checkout',
      { selectedDestination: 'Barcelona' },
      []
    )) {
      chunks.push(chunk);
    }

    const toolResultChunks = chunks.filter(c => c.type === 'tool_result');
    expect(toolResultChunks).toHaveLength(1);
    expect((toolResultChunks[0] as any).result).toEqual({
      success: true,
      checkout_unlocked: true
    });
  });

  it('passes context to system prompt', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');

    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'I see you want to go to Barcelona!' },
      { finish: 'stop' }
    ]));

    const context = {
      selectedDestination: 'Barcelona',
      tripDetails: { people: 5, days: 3 },
      partyType: 'bachelor' as const,
      originCityName: 'Rome'
    };

    for await (const _ of streamOpenAIChatCompletionWithTools('Hello', context, [])) {
      // consume the stream
    }

    // Check that the system prompt includes context
    const callArgs = mockCreate.mock.calls[0][0];
    const systemMessage = callArgs.messages.find((m: any) => m.role === 'system');
    expect(systemMessage.content).toContain('Barcelona');
  });
});
