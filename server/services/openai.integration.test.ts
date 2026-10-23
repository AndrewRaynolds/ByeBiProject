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
  }),
  resolveIataCode: vi.fn((value: string) => {
    const mapping: Record<string, string> = {
      'Rome': 'ROM',
      'Barcelona': 'BCN'
    };
    return mapping[value] || (/^[A-Z]{3}$/i.test(value) ? value.toUpperCase() : null);
  }),
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

  it('clears optional notes through a single validated tool response without a second model call', async () => {
    const { createPlannerDraft } = await import('@shared/plannerSchemas');
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');
    const planner = createPlannerDraft({ brand: 'byebride', origin: 'Rome', destination: 'Ibiza', budgetPerPerson: 700, interests: ['food'] });
    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'Ignored unvalidated filler' },
      { tool_call: { id: 'remove_notes', name: 'update_planner', arguments: JSON.stringify({
        origin: null, destination: null, startDate: null, endDate: null, participants: null,
        budgetPerPerson: null, preferenceArchetype: null, interests: null,
        clearFields: ['budgetPerPerson', 'preferences'],
      }) } },
      { finish: 'tool_calls' },
    ]));
    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools('Togli budget e preferenze', { planner, locale: 'it' })) chunks.push(chunk);
    const result = chunks.find(chunk => chunk.type === 'tool_result');
    expect(result).toMatchObject({ result: { planner: { budgetPerPerson: null, preferences: null, destination: { canonical: 'Ibiza' } } } });
    const content = chunks.filter(chunk => chunk.type === 'content').map(chunk => chunk.content).join('');
    expect(content).toContain('Ho aggiornato');
    expect(content).not.toContain('Ignored');
    expect(content.match(/\?/g)).toHaveLength(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].tools[0].function.parameters.required).toContain('clearFields');
  });

  it('acknowledges a validated unchanged planner without claiming a change', async () => {
    const { createPlannerDraft } = await import('@shared/plannerSchemas');
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');
    const planner = createPlannerDraft({ brand: 'byebro', origin: 'Rome', destination: 'Ibiza', participants: 6 });
    mockCreate.mockResolvedValueOnce(createMockStream([
      { tool_call: { id: 'no_change', name: 'update_planner', arguments: JSON.stringify({
        origin: null, destination: null, startDate: null, endDate: null, participants: null,
        budgetPerPerson: null, preferenceArchetype: null, interests: null,
      }) } }, { finish: 'tool_calls' },
    ]));
    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools('Non so', { planner, locale: 'it' })) chunks.push(chunk);
    expect(chunks.filter(chunk => chunk.type === 'content')).toEqual([{ type: 'content', content: 'Per dare forma al viaggio, quali sono le date di partenza e ritorno?' }]);
  });

  it('uses the final validated planner when one response contains several updates', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');
    const empty = { origin: null, destination: null, startDate: null, endDate: null, participants: null, budgetPerPerson: null, preferenceArchetype: null, interests: null };
    mockCreate.mockResolvedValueOnce({
      async *[Symbol.asyncIterator]() {
        yield { choices: [{ delta: { tool_calls: [
          { index: 0, id: 'first', function: { name: 'update_planner', arguments: JSON.stringify({ ...empty, origin: 'Rome' }) } },
          { index: 1, id: 'second', function: { name: 'update_planner', arguments: JSON.stringify({ ...empty, destination: 'Ibiza', participants: 6 }) } },
        ] }, finish_reason: 'tool_calls' }] };
      },
    });
    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools('Da Roma a Ibiza, siamo 6', { locale: 'it' })) chunks.push(chunk);
    const content = chunks.filter(chunk => chunk.type === 'content').map(chunk => chunk.content).join('');
    expect(content).toContain('date di partenza e ritorno');
    expect(content).not.toContain('Barcellona');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['it', 'Italian', 'Ho aggiornato il riepilogo con i dettagli che hai indicato. Per dare forma al viaggio, quali sono le date di partenza e ritorno?'],
    ['en', 'English', 'I\'ve updated the brief with the details you shared. To shape the trip, what are your departure and return dates?'],
    ['es', 'Spanish', 'He actualizado el resumen con los datos que has compartido. Para dar forma al viaje, ¿cuáles son las fechas de salida y regreso?'],
  ] as const)('keeps selected %s in model instructions and local tool responses', async (locale, language, expected) => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');
    mockCreate.mockResolvedValueOnce(createMockStream([
      { tool_call: { id: 'locale_test', name: 'update_planner', arguments: JSON.stringify({
        origin: 'Rome', destination: 'Barcelona', startDate: null, endDate: null,
        participants: 6, budgetPerPerson: null, preferenceArchetype: null, interests: null,
      }) } },
      { finish: 'tool_calls' },
    ]));
    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools('6', { locale, partyType: 'bachelorette' }, [
      { role: 'user', content: 'Voglio organizzare un viaggio' },
    ])) chunks.push(chunk);
    expect(mockCreate.mock.calls[0][0].messages[0].content).toContain(`Always respond in ${language}`);
    expect(chunks.filter(chunk => chunk.type === 'content')).toEqual([{ type: 'content', content: expected }]);
  });

  it('applies interface locale changes immediately within the same planner chat', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = [
      { role: 'user', content: 'Voglio organizzare un viaggio' },
      { role: 'assistant', content: 'Da quale città partite?' },
    ];
    const cases = [
      ['it', 'Italian', 'Ho aggiornato il riepilogo con i dettagli che hai indicato. Per dare forma al viaggio, quali sono le date di partenza e ritorno?'],
      ['en', 'English', 'I\'ve updated the brief with the details you shared. To shape the trip, what are your departure and return dates?'],
      ['es', 'Spanish', 'He actualizado el resumen con los datos que has compartido. Para dar forma al viaje, ¿cuáles son las fechas de salida y regreso?'],
    ] as const;

    for (const [locale, language, expected] of cases) {
      mockCreate.mockResolvedValueOnce(createMockStream([
        { tool_call: { id: `locale_switch_${locale}`, name: 'update_planner', arguments: JSON.stringify({
          origin: 'Rome', destination: 'Barcelona', startDate: null, endDate: null,
          participants: 6, budgetPerPerson: null, preferenceArchetype: null, interests: null,
        }) } },
        { finish: 'tool_calls' },
      ]));

      const chunks: StreamChunk[] = [];
      for await (const chunk of streamOpenAIChatCompletionWithTools(
        '6',
        { locale, partyType: 'bachelorette' },
        history,
      )) chunks.push(chunk);

      const systemPrompt = mockCreate.mock.calls.at(-1)?.[0]?.messages?.[0]?.content;
      expect(systemPrompt).toContain(`Always respond in ${language}, the selected interface language`);
      expect(systemPrompt).not.toContain('ALWAYS respond in the language the user writes in');
      expect(chunks.filter(chunk => chunk.type === 'content')).toEqual([
        { type: 'content', content: expected },
      ]);

      history.push(
        { role: 'user', content: '6' },
        { role: 'assistant', content: expected },
      );
    }
  });

  it.each([
    ['it', 'Si è verificato un problema. Riprova.'],
    ['es', 'Se ha producido un problema. Inténtalo de nuevo.'],
  ] as const)('localizes streaming failures in %s', async (locale, expected) => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');
    mockCreate.mockRejectedValueOnce(new Error('unavailable'));
    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools('6', { locale })) chunks.push(chunk);
    expect(chunks).toEqual([{ type: 'content', content: expected }]);
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

  it('does not call OpenAI when the request is already aborted', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');
    const controller = new AbortController();
    controller.abort();

    const chunks: StreamChunk[] = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools(
      'Plan my trip',
      {},
      [],
      controller.signal,
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('forwards the cancellation signal to the OpenAI SDK', async () => {
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');
    const controller = new AbortController();
    mockCreate.mockResolvedValueOnce(createMockStream([
      { content: 'Ready to help.' },
      { finish: 'stop' },
    ]));

    for await (const _chunk of streamOpenAIChatCompletionWithTools(
      'Plan my trip',
      {},
      [],
      controller.signal,
    )) {
      // Consume the stream.
    }

    expect(mockCreate).toHaveBeenCalledWith(
      expect.any(Object),
      { signal: controller.signal, maxRetries: 0 },
    );
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
