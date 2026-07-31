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

vi.mock('./amadeus-hotels', () => ({
  searchHotels: vi.fn().mockResolvedValue([]),
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
    mockCreate.mockReset();
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

  it('executes a checkout tool and short-circuits with a local response', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');

    mockCreate.mockResolvedValueOnce(createMockStream([
      {
        tool_call: {
          id: 'call_123',
          name: 'unlock_checkout',
          arguments: '{}'
        }
      },
      { finish: 'tool_calls' }
    ]));

    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools(
      'I want to go to Barcelona',
      {},
      []
    )) {
      chunks.push(chunk);
    }

    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Verify tool call was emitted
    const toolCallChunks = chunks.filter(c => c.type === 'tool_call');
    expect(toolCallChunks).toHaveLength(1);
    expect((toolCallChunks[0] as any).toolCall.name).toBe('unlock_checkout');

    // Verify tool result was emitted
    const toolResultChunks = chunks.filter(c => c.type === 'tool_result');
    expect(toolResultChunks).toHaveLength(1);
    expect((toolResultChunks[0] as any).name).toBe('unlock_checkout');
    expect((toolResultChunks[0] as any).result).toEqual({
      success: true,
      checkout_unlocked: true,
    });

    // Verify final content includes follow-up question
    const contentChunks = chunks.filter(c => c.type === 'content');
    const fullContent = contentChunks.map(c => (c as any).content).join('');
    expect(fullContent.length).toBeGreaterThan(0);
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

    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools(
      'Find flights from Rome to Barcelona June 15-20 for 2 people',
      { selectedDestination: 'Barcelona' },
      []
    )) {
      chunks.push(chunk);
    }

    const toolResultChunks = chunks.filter(c => c.type === 'tool_result');
    expect(toolResultChunks).toHaveLength(1);

    const flightResult = (toolResultChunks[0] as any).result;
    expect(flightResult.checkoutReady).toBe(true);
    expect(flightResult.checkoutUrl).toContain('https://www.aviasales.com/search/');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('continues when a tool requires an OpenAI follow-up', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');

    mockCreate.mockResolvedValueOnce(createMockStream([
      {
        tool_call: {
          id: 'call_1',
          name: 'search_hotels',
          arguments: JSON.stringify({
            destination: 'Barcelona',
            check_in_date: '2027-06-15',
            check_out_date: '2027-06-20',
            guests: 2,
          })
        }
      },
      { finish: 'tool_calls' }
    ]));

    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'Here are the available hotels.' },
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

    expect(mockCreate).toHaveBeenCalledTimes(2);

    const toolCallChunks = chunks.filter(c => c.type === 'tool_call');
    expect(toolCallChunks).toHaveLength(1);
    expect((toolCallChunks[0] as any).toolCall.name).toBe('search_hotels');
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
    expect(mockCreate).toHaveBeenCalledTimes(1);
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
