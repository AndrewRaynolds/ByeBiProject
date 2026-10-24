import { afterEach, describe, expect, it, vi } from 'vitest';

// Use the installed SDK and its actual SSE parser with a synthetic fetch transport.
// No credentials, requests or responses from a live OpenAI service are used.
describe('installed OpenAI SDK planner compatibility', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });
  it('reassembles streamed function arguments and completes the validated brief', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'synthetic-not-a-credential');
    const args = JSON.stringify({ origin: 'milano', destination: null, startDate: null, endDate: null, participants: null, budgetPerPerson: null, preferenceArchetype: null, interests: null, clearFields: [] });
    const chunks = [
      { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'synthetic-call', type: 'function', function: { name: 'update_planner', arguments: args.slice(0, 30) } }] }, finish_reason: null }] },
      { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: args.slice(30) } }] }, finish_reason: null }] },
      { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
    ];
    const request = vi.fn(async () => new Response(chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } }));
    vi.stubGlobal('fetch', request);
    const { createPlannerDraft } = await import('@shared/plannerSchemas');
    const { streamOpenAIChatCompletionWithTools } = await import('./openai');
    const planner = createPlannerDraft({ brand: 'byebride', destination: 'Palma di Maiorca', startDate: '2099-02-24', endDate: '2099-02-27', participants: 5 });
    const output = [];
    for await (const chunk of streamOpenAIChatCompletionWithTools('milano', { planner, locale: 'it' })) output.push(chunk);
    expect(request).toHaveBeenCalledTimes(1);
    expect(output).toContainEqual(expect.objectContaining({ type: 'tool_result', result: expect.objectContaining({ planner: expect.objectContaining({ status: 'review-ready', origin: { canonical: 'Milano' }, brand: 'byebride', participants: 5 }) }) }));
    expect(output.at(-1)).toMatchObject({ type: 'content', content: expect.stringContaining('pronto') });
  });
  it('accepts function calls and ignores unsupported custom tool calls in non-streaming replies', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'synthetic-not-a-credential');
    const args = { origin: 'milano', destination: null, startDate: null, endDate: null, participants: null, budgetPerPerson: null, preferenceArchetype: null, interests: null, clearFields: [] };
    const request = vi.fn(async () => Response.json({ choices: [{ message: { content: null, tool_calls: [
      { id: 'custom-call', type: 'custom', custom: { name: 'unsupported', input: 'synthetic' } },
      { id: 'function-call', type: 'function', function: { name: 'update_planner', arguments: JSON.stringify(args) } },
    ] } }] }));
    vi.stubGlobal('fetch', request);
    const { createOpenAIChatCompletion } = await import('./openai');
    const result = await createOpenAIChatCompletion('milano', { locale: 'it' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(result.toolCalls).toEqual([{ name: 'update_planner', arguments: args }]);
  });

});
